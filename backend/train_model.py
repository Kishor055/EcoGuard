import os
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

def generate_synthetic_data(num_samples=1500):
    """
    Generate synthetic data for training the AQI predictive model.
    Correlates Temperature, Humidity, and PM2.5 with a target AQI.
    """
    np.random.seed(42)
    
    # Generate random features
    # Temp in C (15 to 45)
    temperature = np.random.uniform(15, 45, num_samples)
    # Humidity in % (20 to 95)
    humidity = np.random.uniform(20, 95, num_samples)
    # PM2.5 in ug/m3 (2 to 200)
    pm25 = np.random.uniform(2, 200, num_samples)
    
    # Calculate a realistic mock AQI based on environmental rules:
    # 1. PM2.5 is the strongest driver of AQI
    # 2. High temperatures can worsen ground-level ozone (increasing AQI slightly)
    # 3. High humidity can lock in particulate matter (slight increase)
    # Plus some random noise to make it realistic for ML
    noise = np.random.normal(0, 5, num_samples)
    
    # US AQI PM2.5 approximation formula:
    aqi = (pm25 * 1.6) + (temperature * 0.5) + (humidity * 0.15) + 5 + noise
    
    # Clip AQI to realistic scale [0, 500]
    aqi = np.clip(aqi, 0, 500)
    
    # Reshape features for ML training: X shape (num_samples, 3)
    X = np.stack((temperature, humidity, pm25), axis=1)
    y = aqi
    
    return X, y

def train_and_save_model():
    print("Generating synthetic environmental training data...")
    X, y = generate_synthetic_data(1500)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Regressor model...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print("Model Evaluation Metrics:")
    print(f"   - Mean Squared Error: {mse:.4f}")
    print(f"   - R2 Score: {r2:.4f}")
    
    # Save the model
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(backend_dir, "aqi_model.pkl")
    print(f"Saving model to {model_path}...")
    joblib.dump(model, model_path)
    print("Model trained and saved successfully!")

if __name__ == "__main__":
    train_and_save_model()
