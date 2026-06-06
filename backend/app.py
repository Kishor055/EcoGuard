import os
import random
import time
import requests
import joblib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)


OWM_API_KEY = os.getenv("OWM_API_KEY")
WAQI_TOKEN = os.getenv("WAQI_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Create FastAPI app
app = FastAPI(title="EcoGuard API", description="AI and Multi-Agent Environmental Sustainability API")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for cache and simulated IoT data
CACHE = {}
IOT_ALERTS = []

def set_cache(key: str, value: Any, ttl: int = 300):
    CACHE[key] = (value, time.time() + ttl)

def get_cache(key: str) -> Optional[Any]:
    if key in CACHE:
        value, expiry = CACHE[key]
        if time.time() < expiry:
            return value
    return None

# ==============================
# 📊 DATA MODEL
# ==============================
@dataclass
class EnvironmentData:
    timestamp: datetime
    city: str
    aqi: int = 0
    pm25: float = 0.0
    pm10: float = 0.0
    uv_index: float = 0.0
    temperature_c: float = 0.0
    humidity_pct: int = 0
    rainfall_mm: float = 0.0
    pollen_level: str = "moderate"
    weather_alerts: List[str] = field(default_factory=list)

    def to_dict(self):
        d = {**self.__dict__}
        d["timestamp"] = self.timestamp.isoformat()
        return d

# ==============================
# 🤖 ML MODEL LOADER & FALLBACK
# ==============================
backend_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(backend_dir, "aqi_model.pkl")

def load_ml_model():
    if os.path.exists(MODEL_PATH):
        try:
            return joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"⚠️ Error loading ML model from {MODEL_PATH}: {e}")
    return None

ml_model = load_ml_model()

def predict_aqi_value(temp: float, humidity: float, pm25: float) -> int:
    global ml_model
    if ml_model is None:
        # Reload model just in case it was trained after startup
        ml_model = load_ml_model()
        
    if ml_model is not None:
        try:
            predicted = ml_model.predict([[temp, humidity, pm25]])[0]
            return int(predicted)
        except Exception as e:
            print(f"⚠️ Error predicting with model: {e}")
            
    # Fallback to analytical calculation
    return int(max(0, (pm25 * 1.6) + (temp * 0.5) + (humidity * 0.15) + 5))

# ==============================
# 🌐 API CLIENT HELPERS
# ==============================
def geocode_city_to_coords(city: str) -> Optional[Dict[str, float]]:
    if not OWM_API_KEY:
        return None
    try:
        url = "http://api.openweathermap.org/geo/1.0/direct"
        params = {"q": city, "limit": 1, "appid": OWM_API_KEY}
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        items = resp.json()
        if items:
            return {"lat": items[0]["lat"], "lon": items[0]["lon"]}
    except Exception as e:
        print(f"Geocoding error for {city}: {e}")
    return None

def call_openweather_current(lat: float, lon: float) -> Dict[str, Any]:
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "appid": OWM_API_KEY, "units": "metric"}
    resp = requests.get(url, params=params, timeout=5)
    resp.raise_for_status()
    return resp.json()

def call_openweather_air_pollution(lat: float, lon: float) -> Dict[str, Any]:
    url = "https://api.openweathermap.org/data/2.5/air_pollution"
    params = {"lat": lat, "lon": lon, "appid": OWM_API_KEY}
    resp = requests.get(url, params=params, timeout=5)
    resp.raise_for_status()
    return resp.json()

def call_waqi_city(city: str) -> Dict[str, Any]:
    url = f"https://api.waqi.info/feed/{city}/"
    params = {"token": WAQI_TOKEN}
    resp = requests.get(url, params=params, timeout=5)
    resp.raise_for_status()
    return resp.json()

# ==============================
# 🌍 ENVIRONMENT AGENT
# ==============================
class EnvironmentAgent:
    def fetch_current(self, city: str, date: Optional[datetime] = None) -> EnvironmentData:
        if date is None:
            date = datetime.utcnow()
            
        cache_key = f"env:{city}:{date.strftime('%Y-%m-%d')}"
        cached = get_cache(cache_key)
        if cached:
            return cached

        # Attempt to use real APIs if OWM key is configured
        if OWM_API_KEY:
            coords = geocode_city_to_coords(city)
            if coords:
                try:
                    w = call_openweather_current(coords["lat"], coords["lon"])
                    temp = w.get("main", {}).get("temp")
                    humidity = w.get("main", {}).get("humidity")
                    
                    pm25 = None
                    pm10 = None
                    aqi = None
                    
                    try:
                        ap = call_openweather_air_pollution(coords["lat"], coords["lon"])
                        if "list" in ap and ap["list"]:
                            owm_aqi_index = ap["list"][0]["main"].get("aqi")  # 1-5 scale
                            aqi = int(owm_aqi_index * 50) if owm_aqi_index else None
                            comps = ap["list"][0].get("components", {})
                            pm25 = comps.get("pm2_5")
                            pm10 = comps.get("pm10")
                    except Exception as e:
                        print(f"Air pollution fetch error: {e}")
                    
                    if WAQI_TOKEN:
                        try:
                            waqi = call_waqi_city(city)
                            if waqi.get("status") == "ok" and "data" in waqi:
                                aqi = int(waqi["data"].get("aqi") or (aqi or 0))
                                iaqi = waqi["data"].get("iaqi", {})
                                pm25 = iaqi.get("pm25", {}).get("v", pm25)
                                pm10 = iaqi.get("pm10", {}).get("v", pm10)
                        except Exception as e:
                            print(f"WAQI token fetch error: {e}")

                    # UV Index calculation (simulate or grab if available)
                    uv = round(max(0.0, min(11.0, random.gauss(5.5, 2.0))), 1)
                    
                    env = EnvironmentData(
                        timestamp=date,
                        city=city,
                        aqi=int(aqi or random.randint(40, 150)),
                        pm25=round(pm25 or random.uniform(5, 45), 1),
                        pm10=round(pm10 or random.uniform(10, 65), 1),
                        uv_index=uv,
                        temperature_c=float(temp if temp is not None else round(random.uniform(22, 35), 1)),
                        humidity_pct=int(humidity if humidity is not None else random.randint(30, 85)),
                        rainfall_mm=round(max(0.0, random.gauss(0.5, 2.0)), 1),
                        pollen_level=random.choice(["low", "moderate", "high"]),
                        weather_alerts=w.get("alerts", [])
                    )
                    set_cache(cache_key, env)
                    return env
                except Exception as e:
                    print(f"Error querying live weather APIs: {e}. Trying keyless Open-Meteo API.")

        # Fallback to keyless Open-Meteo API if OWM key is not configured or failed
        try:
            # 1. Geocode city name to coordinates using Open-Meteo Geocoding
            geo_url = "https://geocoding-api.open-meteo.com/v1/search"
            geo_params = {"name": city, "count": 1, "format": "json"}
            geo_resp = requests.get(geo_url, params=geo_params, timeout=5)
            
            if geo_resp.status_code == 200 and geo_resp.json().get("results"):
                res = geo_resp.json()["results"][0]
                lat = float(res["latitude"])
                lon = float(res["longitude"])
                
                # 2. Fetch real-time weather from Open-Meteo Weather API
                weather_url = "https://api.open-meteo.com/v1/forecast"
                weather_params = {
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,rain"
                }
                w_resp = requests.get(weather_url, params=weather_params, timeout=5)
                
                # 3. Fetch real-time air quality from Open-Meteo Air Quality API
                aq_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
                aq_params = {
                    "latitude": lat,
                    "longitude": lon,
                    "current": "pm2_5,pm10,us_aqi,uv_index"
                }
                aq_resp = requests.get(aq_url, params=aq_params, timeout=5)
                
                temp = 25.0
                humidity = 60
                rain = 0.0
                aqi = 50
                pm25 = 12.0
                pm10 = 20.0
                uv = 3.0
                
                if w_resp.status_code == 200:
                    w_data = w_resp.json().get("current", {})
                    temp = w_data.get("temperature_2m", temp)
                    humidity = w_data.get("relative_humidity_2m", humidity)
                    rain = w_data.get("rain", rain)
                    
                if aq_resp.status_code == 200:
                    aq_data = aq_resp.json().get("current", {})
                    aqi = aq_data.get("us_aqi", aqi)
                    pm25 = aq_data.get("pm2_5", pm25)
                    pm10 = aq_data.get("pm10", pm10)
                    uv = aq_data.get("uv_index", uv)
                    
                env = EnvironmentData(
                    timestamp=date,
                    city=city,
                    aqi=int(aqi),
                    pm25=float(pm25),
                    pm10=float(pm10),
                    uv_index=float(uv),
                    temperature_c=float(temp),
                    humidity_pct=int(humidity),
                    rainfall_mm=float(rain),
                    pollen_level=random.choice(["low", "moderate", "high"]),
                    weather_alerts=[]
                )
                
                # Custom weather alerts from open-meteo if temperature is high or rain is high
                if temp >= 38:
                    env.weather_alerts.append("Extreme Heat Advisory")
                if rain > 10.0:
                    env.weather_alerts.append("Heavy Rainfall Advisory")
                if aqi > 150:
                    env.weather_alerts.append("High Air Pollution Alert")
                    
                set_cache(cache_key, env)
                return env
        except Exception as e:
            print(f"Error querying Open-Meteo keyless APIs: {e}. Falling back to mock data.")

        # Seeded deterministic mock fallback based on city and date
        seed = sum(ord(c) for c in (city or "default")) + date.day + date.month + date.year
        rnd = random.Random(seed)
        
        # City specific presets for realistic mock data
        base_aqi = 50
        base_temp = 25
        base_humidity = 60
        
        city_lower = city.lower()
        if "delhi" in city_lower:
            base_aqi = 210
            base_temp = 32
            base_humidity = 40
        elif "mumbai" in city_lower:
            base_aqi = 85
            base_temp = 30
            base_humidity = 80
        elif "london" in city_lower:
            base_aqi = 40
            base_temp = 16
            base_humidity = 75
        elif "new york" in city_lower or "nyc" in city_lower:
            base_aqi = 55
            base_temp = 21
            base_humidity = 55
        elif "sydney" in city_lower:
            base_aqi = 35
            base_temp = 19
            base_humidity = 65
        elif "tokyo" in city_lower:
            base_aqi = 45
            base_temp = 20
            base_humidity = 60

        aqi = int(max(10, min(500, rnd.gauss(base_aqi, 35))))
        temp = round(rnd.gauss(base_temp, 5), 1)
        humidity = int(max(10, min(100, rnd.gauss(base_humidity, 15))))
        pm25 = round(max(1.0, rnd.gauss(aqi / 2.8, 3.5)), 1)
        pm10 = round(max(5.0, rnd.gauss(aqi / 1.8, 6.0)), 1)
        uv = round(max(0.0, min(11.0, rnd.uniform(1.0, 10.0))), 1)
        rainfall = round(max(0.0, rnd.gauss(0.8, 4.0)), 1)
        pollen = rnd.choice(["low", "moderate", "high"])

        weather_alerts = []
        if aqi > 250:
            weather_alerts.append("Severe Smog Advisory")
        if temp > 40:
            weather_alerts.append("Extreme Heat Warning")
        if rainfall > 15:
            weather_alerts.append("Heavy Rainfall Alert")

        env = EnvironmentData(
            timestamp=date,
            city=city,
            aqi=aqi,
            pm25=pm25,
            pm10=pm10,
            uv_index=uv,
            temperature_c=temp,
            humidity_pct=humidity,
            rainfall_mm=rainfall,
            pollen_level=pollen,
            weather_alerts=weather_alerts
        )
        set_cache(cache_key, env)
        return env

# ==============================
# 🛡️ SAFETY AGENT
# ==============================
class SafetyAgent:
    def advise(self, env: EnvironmentData, user: Dict[str, Any]) -> Dict[str, Any]:
        tips = []
        reasons = []
        
        aqi = env.aqi
        if aqi <= 50:
            tips.append("Air quality is excellent. Great day for outdoor activities!")
        elif aqi <= 100:
            tips.append("Air quality is moderate. Sensitive individuals should monitor respiratory symptoms.")
        elif aqi <= 150:
            tips.append("Air quality is unhealthy for sensitive groups. Limit heavy outdoor exertion.")
            reasons.append("aqi_unhealthy_sensitive")
        elif aqi <= 200:
            tips.append("Air quality is unhealthy. Wear an N95 mask outdoors and limit physical exertion.")
            reasons.append("aqi_unhealthy")
        elif aqi <= 300:
            tips.append("Very Unhealthy. Avoid outdoor activities, keep windows closed, and run an air purifier.")
            reasons.append("aqi_very_unhealthy")
        else:
            tips.append("Hazardous conditions! Stay strictly indoors. Place damp towels near draft zones.")
            reasons.append("aqi_hazardous")

        if user.get("asthma") or user.get("has_asthma"):
            tips.append("Asthma Alert: Ensure your rescue inhaler is close at hand. Limit outdoor exposure during peak ozone hours.")
            reasons.append("has_asthma_alert")

        if env.uv_index >= 8:
            tips.append("Extreme UV Index: Use SPF 30+ sunscreen, wear protective clothing, sunglasses, and a wide-brimmed hat.")
            reasons.append("high_uv")
        elif env.uv_index >= 6:
            tips.append("High UV: Seek shade during midday hours. Apply sunscreen.")

        if env.temperature_c >= 38:
            tips.append("Extreme Heat: Risk of heat exhaustion. Drink plenty of water and rest in air-conditioned spaces.")
            reasons.append("extreme_heat")
        elif env.temperature_c <= 5:
            tips.append("Freezing Temp: Dress in layers. Keep sensitive plants sheltered.")

        if env.pollen_level == "high":
            tips.append("High Pollen Counts: Allergy risk is elevated. Keep windows closed and rinse off pollen after being outdoors.")
            reasons.append("high_pollen")

        return {
            "tips": tips,
            "reasons": reasons,
            "short_summary": tips[0] if tips else "Environmental conditions are stable and safe."
        }

# ==============================
# 🌱 COMMUNITY AGENT
# ==============================
class CommunityAgent:
    ACTIONS = [
        "Take a walk, ride a bicycle, or use public transit instead of driving.",
        "Refuse single-use plastics today; carry a reusable water bottle and shopping bag.",
        "Plant a local herb or seedling in your balcony or garden.",
        "Turn off appliances at the outlet to reduce vampire energy draw.",
        "Share a local environmental alert or conservation tip with friends.",
        "Compost kitchen vegetable scraps to cut methane production in landfills.",
        "Report environmental hazards like local waste burning or trash dumping."
    ]
    
    def suggest_actions(self, env: EnvironmentData, n: int = 3) -> List[str]:
        # Seed logic slightly with AQI to offer relevant actions
        rnd = random.Random(env.aqi + int(env.temperature_c))
        actions = []
        
        if env.aqi > 150:
            actions.append("Refrain from open waste burning or using gasoline-powered lawn tools.")
        if env.rainfall_mm > 5:
            actions.append("Set up a rainwater harvesting bucket to water plants later.")
        elif env.temperature_c > 30:
            actions.append("Water outdoor plants in the early morning or evening to reduce evaporation loss.")
            
        remaining_count = max(0, n - len(actions))
        pool = [a for a in self.ACTIONS if a not in actions]
        actions.extend(rnd.sample(pool, min(len(pool), remaining_count)))
        
        return actions

# ==============================
# 📅 PLANNER AGENT
# ==============================
class PlannerAgent:
    def plan_week(self, city: str) -> List[Dict[str, Any]]:
        start_date = datetime.utcnow()
        plan = []
        env_agent = EnvironmentAgent()
        
        for i in range(7):
            date = start_date + timedelta(days=i)
            env = env_agent.fetch_current(city, date)
            
            # Predict activity mood based on parameters
            if env.aqi <= 100 and env.uv_index <= 7 and env.temperature_c <= 35:
                mood = "Highly recommended for outdoor activities and exercise."
                suitability = "Optimal"
            elif env.aqi <= 150 and env.temperature_c <= 38:
                mood = "Moderate outdoor suitability. Sensitive groups should exercise indoors."
                suitability = "Moderate"
            else:
                mood = "Unfavorable environmental conditions. Plan for indoor recreational activities."
                suitability = "Unfavorable"
                
            # Determine plant care advice
            if env.rainfall_mm >= 3.0:
                plant_care = "Rain expected ({}mm). Cancel scheduled manual watering to conserve resource.".format(env.rainfall_mm)
            elif env.temperature_c >= 33:
                plant_care = "High evaporation rate. Double-water plants early in the morning."
            else:
                plant_care = "Standard irrigation cycle. Water plants moderately."
                
            plan.append({
                "day": i,
                "date": date.strftime("%Y-%m-%d"),
                "day_name": date.strftime("%A"),
                "aqi": env.aqi,
                "temp": env.temperature_c,
                "rainfall": env.rainfall_mm,
                "suitability": suitability,
                "mood": mood,
                "plant_care": plant_care
            })
            
        return plan

# ==============================
# 📊 REPORTER AGENT
# ==============================
class ReporterAgent:
    def generate_report(self, env: EnvironmentData, safety: Dict[str, Any], actions: List[str], user: Dict[str, Any]) -> Dict[str, Any]:
        username = user.get("name") or "EcoGuardian"
        greeting = f"EcoGuard Report for {username}"
        
        summary_lines = [
            f"### {greeting}",
            f"**City**: {env.city} | **Report Time**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            f"**Current Status**: {safety['short_summary']}",
            "",
            "#### 📊 Local Parameters",
            f"- **Air Quality Index (AQI)**: {env.aqi} (PM2.5: {env.pm25} µg/m³, PM10: {env.pm10} µg/m³)",
            f"- **Temperature**: {env.temperature_c} °C | **Humidity**: {env.humidity_pct}%",
            f"- **UV Exposure**: {env.uv_index} Index | **Precipitation**: {env.rainfall_mm} mm",
            f"- **Pollen Concentration**: {env.pollen_level.capitalize()}",
        ]
        
        if env.weather_alerts:
            summary_lines.append(f"- **Active Warnings**: {', '.join(env.weather_alerts)}")
            
        summary_lines.extend([
            "",
            "#### 🛡️ Personalized Safety Guidelines",
        ])
        for tip in safety["tips"]:
            summary_lines.append(f"- {tip}")
            
        summary_lines.extend([
            "",
            "#### 🌱 Actionable Eco-Task List",
        ])
        for action in actions:
            summary_lines.append(f"- [ ] {action}")
            
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "city": env.city,
            "summary_text": "\n".join(summary_lines),
            "env": env.to_dict(),
            "safety": safety,
            "actions": actions,
            "user": user
        }

# ==============================
# 🧠 AI ASSISTANT SYSTEM
# ==============================
def generate_agent_chat_response(message: str, env: EnvironmentData, safety: Dict[str, Any]) -> str:
    """
    Generates a contextual response using the local agents' metrics.
    If GEMINI_API_KEY is active, it calls the Google Gemini API using a system prompt.
    """
    system_prompt = f"""You are the EcoGuard AI Assistant, a friendly, intelligent environmental conservation companion.
You are helping a user stay safe and conserve energy.
Current City Context: {env.city}
- AQI: {env.aqi}
- PM2.5: {env.pm25} µg/m³
- Temperature: {env.temperature_c}°C
- Humidity: {env.humidity_pct}%
- UV Index: {env.uv_index}
- Pollen level: {env.pollen_level}
- Safety Summary: {safety['short_summary']}

Be helpful, informative, and keep your suggestions concise and action-oriented. Provide tips on ecology, energy conservation, health, or green habits.
"""
    
    if OPENAI_API_KEY:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                "temperature": 0.7,
                "max_tokens": 400
            }
            resp = requests.post(url, headers=headers, json=payload, timeout=8)
            if resp.status_code == 200:
                result = resp.json()
                text = result["choices"][0]["message"]["content"]
                return text.strip()
            else:
                print(f"OpenAI API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")

    if GEMINI_API_KEY:
        try:
            # Let's call Gemini API using Google GenAI SDK or raw request
            # Since the environment imports and configures google-genai, let's use requests or direct client call
            # To be 100% reliable without client installation issues, we can call the direct Gemini REST API endpoint:
            # https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=...
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": f"System Context:\n{system_prompt}\n\nUser Question: {message}\nAssistant Response:"}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 400
                }
            }
            resp = requests.post(url, json=payload, timeout=8)
            if resp.status_code == 200:
                result = resp.json()
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                return text.strip()
            else:
                print(f"Gemini API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"Error calling Gemini API: {e}")


    # --- Rule-Based Fallback ---
    msg_lower = message.lower()
    
    # Greetings
    if any(g in msg_lower for g in ["hello", "hi", "hey", "greetings"]):
        return f"Hello! 🌱 I am the EcoGuard AI Assistant. I monitor environmental parameters for **{env.city}** (AQI is currently **{env.aqi}**). How can I help you stay safe or act green today?"
        
    # AQI / Air Quality query
    if any(q in msg_lower for q in ["aqi", "air quality", "pollution", "pm2.5", "smog"]):
        status = "Good" if env.aqi <= 50 else "Moderate" if env.aqi <= 100 else "Unhealthy" if env.aqi <= 200 else "Hazardous"
        response = f"The current Air Quality Index (AQI) in **{env.city}** is **{env.aqi}**, which is classified as **{status}**.\n\n"
        if env.aqi > 100:
            response += f"Particulate matter PM2.5 is at **{env.pm25} µg/m³**. I recommend limiting outdoor exertion and wearing a mask if going out."
        else:
            response += "Conditions are healthy! Great time for outdoor exercises or ventilation."
        return response
        
    # Temperature / Weather query
    if any(q in msg_lower for q in ["temperature", "weather", "hot", "cold", "rain", "humidity"]):
        response = f"Currently in **{env.city}**, it is **{env.temperature_c}°C** with **{env.humidity_pct}%** humidity."
        if env.rainfall_mm > 0:
            response += f" There is active rainfall of **{env.rainfall_mm} mm**."
        if env.temperature_c >= 35:
            response += " It's quite hot! Remember to stay hydrated and avoid exposure to the midday sun."
        return response
        
    # Tips / Actions query
    if any(q in msg_lower for q in ["tips", "conservation", "eco", "actions", "help", "green", "planting"]):
        actions = CommunityAgent().suggest_actions(env, 2)
        response = "Here are a few quick eco-conservation tasks you can do right now:\n\n"
        for i, act in enumerate(actions, 1):
            response += f"{i}. 🌟 {act}\n"
        response += "\nSmall habits create monumental global changes!"
        return response
        
    # Health queries (Asthma, UV, Pollen)
    if any(q in msg_lower for q in ["asthma", "health", "pollen", "allergies", "uv"]):
        response = f"For **{env.city}**, the UV index is **{env.uv_index}** and Pollen concentration is **{env.pollen_level}**.\n\n"
        if env.pollen_level == "high":
            response += "• High pollen can trigger allergies. Keep windows closed.\n"
        if env.uv_index >= 6:
            response += "• UV levels require sunscreen and protective gear.\n"
        if env.aqi > 100:
            response += "• Due to AQI levels, asthma sufferers should remain vigilant and carry their inhalers."
        else:
            response += "• General metrics are safe, but monitor your breathing if sensitive."
        return response

    # Default fallback
    return f"I can help you analyze environmental parameters or build green habits! It seems you asked about '{message}'. Could you clarify if you'd like info on air quality, local weather, safety tips, or daily eco-actions in **{env.city}**?"

# ==============================
# 🚀 PYDANTIC INPUT MODELS
# ==============================
class AnalyzeInput(BaseModel):
    city: str
    name: Optional[str] = "EcoGuardian"
    asthma: Optional[bool] = False

class PredictInput(BaseModel):
    temperature: float
    humidity: float
    pm25: float

class ChatInput(BaseModel):
    message: str
    city: str
    asthma: Optional[bool] = False
    name: Optional[str] = "EcoGuardian"

class IotTelemetryInput(BaseModel):
    device_id: str
    pm25: float
    temperature: float
    humidity: float
    gas_level: float
    noise_level: float

# ==============================
# 🛣️ FASTAPI ROUTES
# ==============================
@app.get("/")
def home():
    return {
        "status": "online",
        "service": "EcoGuard PRO API",
        "timestamp": datetime.utcnow().isoformat(),
        "ml_model_loaded": ml_model is not None or os.path.exists(MODEL_PATH)
    }

@app.get("/api/city-suggestions")
def get_cities():
    return [
        {"name": "Mumbai", "country": "IN", "region": "Maharashtra"},
        {"name": "Delhi", "country": "IN", "region": "National Capital Region"},
        {"name": "London", "country": "UK", "region": "Greater London"},
        {"name": "New York", "country": "US", "region": "New York"},
        {"name": "Tokyo", "country": "JP", "region": "Kanto"},
        {"name": "Sydney", "country": "AU", "region": "New South Wales"},
        {"name": "Cairo", "country": "EG", "region": "Cairo"},
        {"name": "Paris", "country": "FR", "region": "Île-de-France"}
    ]

@app.get("/api/weather/{city}")
def get_weather(city: str):
    env_agent = EnvironmentAgent()
    env = env_agent.fetch_current(city)
    return env.to_dict()

@app.post("/api/analyze")
def analyze_environment(input: AnalyzeInput):
    env_agent = EnvironmentAgent()
    safety_agent = SafetyAgent()
    community_agent = CommunityAgent()
    planner_agent = PlannerAgent()
    reporter_agent = ReporterAgent()

    try:
        env = env_agent.fetch_current(input.city)
        user_profile = {"name": input.name, "has_asthma": input.asthma}
        
        safety = safety_agent.advise(env, user_profile)
        actions = community_agent.suggest_actions(env, n=3)
        weekly_plan = planner_agent.plan_week(input.city)
        report = reporter_agent.generate_report(env, safety, actions, user_profile)
        
        return {
            "environment": env.to_dict(),
            "safety": safety,
            "actions": actions,
            "weekly_plan": weekly_plan,
            "report": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")

@app.post("/api/predict-aqi")
def predict_aqi(input: PredictInput):
    predicted = predict_aqi_value(input.temperature, input.humidity, input.pm25)
    
    # Classify the predicted AQI
    if predicted <= 50:
        category = "Good"
        color = "#10B981"
    elif predicted <= 100:
        category = "Moderate"
        color = "#F59E0B"
    elif predicted <= 150:
        category = "Unhealthy for Sensitive Groups"
        color = "#EF4444"
    elif predicted <= 200:
        category = "Unhealthy"
        color = "#DC2626"
    elif predicted <= 300:
        category = "Very Unhealthy"
        color = "#7C3AED"
    else:
        category = "Hazardous"
        color = "#7F1D1D"

    return {
        "predicted_aqi": predicted,
        "category": category,
        "color": color,
        "features": {
            "temperature": input.temperature,
            "humidity": input.humidity,
            "pm25": input.pm25
        }
    }

@app.post("/api/chat")
def assistant_chat(input: ChatInput):
    env_agent = EnvironmentAgent()
    safety_agent = SafetyAgent()
    
    env = env_agent.fetch_current(input.city)
    user_profile = {"name": input.name, "has_asthma": input.asthma}
    safety = safety_agent.advise(env, user_profile)
    
    response = generate_agent_chat_response(input.message, env, safety)
    return {
        "response": response,
        "city": input.city,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/iot-ingest")
def iot_ingest(input: IotTelemetryInput):
    # Process IoT Packet
    alerts = []
    
    if input.pm25 > 150:
        alerts.append({
            "severity": "critical",
            "type": "AQI",
            "message": f"CRITICAL: High particulate matter (PM2.5: {input.pm25} µg/m³) detected on sensor {input.device_id}!"
        })
    elif input.pm25 > 55:
        alerts.append({
            "severity": "warning",
            "type": "AQI",
            "message": f"WARNING: Elevated PM2.5 levels ({input.pm25} µg/m³) detected on sensor {input.device_id}."
        })
        
    if input.gas_level > 60:
        alerts.append({
            "severity": "critical",
            "type": "Toxic Gas",
            "message": f"CRITICAL: High toxic gas / VOC concentration ({input.gas_level} ppm) detected on sensor {input.device_id}!"
        })
    elif input.gas_level > 35:
        alerts.append({
            "severity": "warning",
            "type": "Gas Leak",
            "message": f"WARNING: Minor VOC leaks ({input.gas_level} ppm) detected on sensor {input.device_id}."
        })
        
    if input.noise_level > 85:
        alerts.append({
            "severity": "warning",
            "type": "Noise Pollution",
            "message": f"WARNING: High decibel reading ({input.noise_level} dB) on sensor {input.device_id}!"
        })

    # Add to global in-memory alerts log (keep last 20)
    for alert in alerts:
        alert["timestamp"] = datetime.utcnow().strftime("%H:%M:%S")
        alert["device_id"] = input.device_id
        IOT_ALERTS.insert(0, alert)
        
    if len(IOT_ALERTS) > 20:
        IOT_ALERTS.pop()

    return {
        "status": "success",
        "processed_at": datetime.utcnow().isoformat(),
        "alerts_triggered": alerts,
        "active_alerts_count": len(alerts)
    }

@app.get("/api/iot-alerts")
def get_iot_alerts():
    return IOT_ALERTS
