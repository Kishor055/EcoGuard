# ==============================
# 🌱 EcoGuard PRO - Unified Backend
# ==============================

import os
import random
import time
import requests
import joblib
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, field

from fastapi import FastAPI
from pydantic import BaseModel

# ==============================
# 🔐 CONFIG
# ==============================
OWM_API_KEY = os.getenv("OWM_API_KEY")
WAQI_TOKEN = os.getenv("WAQI_TOKEN")

# ==============================
# ⚡ CACHE SYSTEM
# ==============================
CACHE = {}

def set_cache(key, value, ttl=300):
    CACHE[key] = (value, time.time() + ttl)

def get_cache(key):
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
    aqi: int
    pm25: float
    pm10: float
    uv_index: float
    temperature_c: float
    humidity_pct: int
    rainfall_mm: float
    pollen_level: str
    weather_alerts: list = field(default_factory=list)

    def to_dict(self):
        return self.__dict__

# ==============================
# 🤖 ML MODEL (LOAD OR FALLBACK)
# ==============================
MODEL_PATH = "aqi_model.pkl"

def load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None

model = load_model()

def predict_aqi(temp, humidity, pm25):
    if model:
        return int(model.predict([[temp, humidity, pm25]])[0])
    # fallback logic
    return int((pm25 * 2) + (temp * 1.5) - humidity * 0.3)

# ==============================
# 🌐 API HELPERS
# ==============================
def geocode(city):
    url = "http://api.openweathermap.org/geo/1.0/direct"
    params = {"q": city, "limit": 1, "appid": OWM_API_KEY}
    r = requests.get(url, params=params)
    data = r.json()
    if data:
        return data[0]["lat"], data[0]["lon"]
    return None, None

def fetch_weather(lat, lon):
    url = "https://api.openweathermap.org/data/2.5/weather"
    return requests.get(url, params={
        "lat": lat, "lon": lon,
        "appid": OWM_API_KEY,
        "units": "metric"
    }).json()

def fetch_air(lat, lon):
    url = "https://api.openweathermap.org/data/2.5/air_pollution"
    return requests.get(url, params={
        "lat": lat, "lon": lon,
        "appid": OWM_API_KEY
    }).json()

def fetch_waqi(city):
    url = f"https://api.waqi.info/feed/{city}/"
    return requests.get(url, params={"token": WAQI_TOKEN}).json()

# ==============================
# 🌍 ENVIRONMENT AGENT
# ==============================
class EnvironmentAgent:
    def fetch(self, city: str):

        cache_key = f"env:{city}"
        cached = get_cache(cache_key)
        if cached:
            return cached

        now = datetime.utcnow()

        if OWM_API_KEY:
            try:
                lat, lon = geocode(city)
                if lat:
                    weather = fetch_weather(lat, lon)
                    air = fetch_air(lat, lon)

                    temp = weather["main"]["temp"]
                    humidity = weather["main"]["humidity"]

                    comp = air["list"][0]["components"]
                    pm25 = comp.get("pm2_5", 20)
                    pm10 = comp.get("pm10", 30)

                    aqi = predict_aqi(temp, humidity, pm25)

                    if WAQI_TOKEN:
                        try:
                            w = fetch_waqi(city)
                            if w["status"] == "ok":
                                aqi = w["data"]["aqi"]
                        except:
                            pass

                    env = EnvironmentData(
                        timestamp=now,
                        city=city,
                        aqi=int(aqi),
                        pm25=pm25,
                        pm10=pm10,
                        uv_index=random.uniform(3, 10),
                        temperature_c=temp,
                        humidity_pct=humidity,
                        rainfall_mm=random.uniform(0, 5),
                        pollen_level=random.choice(["low", "moderate", "high"]),
                    )

                    set_cache(cache_key, env)
                    return env

            except:
                pass

        # fallback mock
        rnd = random.Random(city)
        env = EnvironmentData(
            timestamp=now,
            city=city,
            aqi=rnd.randint(50, 200),
            pm25=rnd.uniform(10, 50),
            pm10=rnd.uniform(20, 80),
            uv_index=rnd.uniform(3, 10),
            temperature_c=rnd.uniform(20, 38),
            humidity_pct=rnd.randint(30, 90),
            rainfall_mm=rnd.uniform(0, 10),
            pollen_level=rnd.choice(["low", "moderate", "high"]),
        )

        set_cache(cache_key, env)
        return env

# ==============================
# 🛡️ SAFETY AGENT
# ==============================
class SafetyAgent:
    def advise(self, env, user):
        tips = []

        if env.aqi > 300:
            tips.append("Hazardous air! Stay indoors.")
        elif env.aqi > 150:
            tips.append("Unhealthy air. Avoid outdoor activity.")
        elif env.aqi > 100:
            tips.append("Limit prolonged exposure.")

        if env.temperature_c > 35:
            tips.append("High heat. Stay hydrated.")

        if env.uv_index > 8:
            tips.append("High UV. Use sunscreen.")

        if user.get("asthma"):
            tips.append("Carry inhaler.")

        return {
            "summary": tips[0] if tips else "Good conditions",
            "tips": tips
        }

# ==============================
# 🌱 COMMUNITY AGENT
# ==============================
class CommunityAgent:
    ACTIONS = [
        "Use reusable bottles",
        "Avoid plastic",
        "Plant a tree",
        "Save electricity",
        "Use public transport"
    ]

    def suggest(self):
        return random.sample(self.ACTIONS, 3)

# ==============================
# 📅 PLANNER AGENT
# ==============================
class PlannerAgent:
    def plan(self, city):
        env_agent = EnvironmentAgent()
        week = []

        for i in range(7):
            env = env_agent.fetch(city)
            week.append({
                "day": i,
                "aqi": env.aqi,
                "temp": env.temperature_c,
                "activity": "Outdoor" if env.aqi < 100 else "Indoor"
            })

        return week

# ==============================
# 🧠 LLM ASSISTANT
# ==============================
def generate_advice(env):
    if env.aqi > 150:
        return "Air quality is unhealthy. Stay indoors."
    elif env.aqi > 100:
        return "Limit outdoor exposure."
    else:
        return "Great day for outdoor activity!"

# ==============================
# 📊 REPORTER
# ==============================
class ReporterAgent:
    def generate(self, env, safety, actions, plan):
        return {
            "city": env.city,
            "timestamp": env.timestamp.isoformat(),
            "aqi": env.aqi,
            "temperature": env.temperature_c,
            "humidity": env.humidity_pct,
            "summary": safety["summary"],
            "tips": safety["tips"],
            "actions": actions,
            "weekly_plan": plan
        }

# ==============================
# 🚀 FASTAPI APP
# ==============================
app = FastAPI(title="EcoGuard PRO")

class Input(BaseModel):
    city: str
    asthma: Optional[bool] = False

@app.get("/")
def home():
    return {"message": "EcoGuard PRO Running 🚀"}

@app.post("/analyze")
def analyze(input: Input):
    env = EnvironmentAgent().fetch(input.city)
    safety = SafetyAgent().advise(env, input.dict())
    actions = CommunityAgent().suggest()
    plan = PlannerAgent().plan(input.city)

    result = ReporterAgent().generate(env, safety, actions, plan)
    return result

@app.get("/assistant")
def assistant(city: str):
    env = EnvironmentAgent().fetch(city)
    return {
        "city": city,
        "advice": generate_advice(env)
    }
