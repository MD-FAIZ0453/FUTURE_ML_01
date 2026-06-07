import os
import json
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import sys

# Add src to python path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from forecasting import forecast_sales
from evaluation import evaluate_model

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)  # Enable CORS for development flexibility

UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'raw'))
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure outputs directory exists
OUTPUTS_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'outputs'))
os.makedirs(OUTPUTS_FOLDER, exist_ok=True)

# Default dataset path
DEFAULT_CSV_PATH = os.path.join(UPLOAD_FOLDER, 'Sample-Superstore.csv')

def clean_custom_data(df, date_col, target_col):
    df = df.copy()
    # Remove duplicates
    df.drop_duplicates(inplace=True)
    
    # Convert target to numeric (coerce errors to NaN)
    df[target_col] = pd.to_numeric(df[target_col], errors='coerce')
    
    # Convert date to datetime (coerce errors to NaN)
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    
    # Drop rows with null in date or target
    df = df.dropna(subset=[date_col, target_col])
    
    # Sort by date
    df = df.sort_values(date_col)
    
    # Create time features
    df['Year'] = df[date_col].dt.year
    df['Month'] = df[date_col].dt.month
    df['Quarter'] = df[date_col].dt.quarter
    df['DayOfWeek'] = df[date_col].dt.day_name()
    return df

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/api/preview-default', methods=['GET'])
def preview_default():
    if not os.path.exists(DEFAULT_CSV_PATH):
        return jsonify({"error": f"Default Sample-Superstore.csv not found at {DEFAULT_CSV_PATH}"}), 404
    
    try:
        df = pd.read_csv(DEFAULT_CSV_PATH, encoding='latin1')
        summary = {
            "filename": "Sample-Superstore.csv",
            "rows": len(df),
            "columns": list(df.columns),
            "missing_values": df.isnull().sum().to_dict(),
            "dtypes": {col: str(df[col].dtype) for col in df.columns},
            "sample_data": df.head(15).fillna("").to_dict(orient='records')
        }
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file and file.filename.endswith('.csv'):
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(save_path)
        
        try:
            df = pd.read_csv(save_path, encoding='latin1')
            summary = {
                "filename": filename,
                "rows": len(df),
                "columns": list(df.columns),
                "missing_values": df.isnull().sum().to_dict(),
                "dtypes": {col: str(df[col].dtype) for col in df.columns},
                "sample_data": df.head(15).fillna("").to_dict(orient='records')
            }
            return jsonify(summary)
        except Exception as e:
            return jsonify({"error": f"Failed to parse CSV: {str(e)}"}), 500
    else:
        return jsonify({"error": "Only CSV files are supported"}), 400

@app.route('/api/forecast', methods=['POST'])
def run_forecast():
    data = request.json or {}
    filename = data.get('filename', 'Sample-Superstore.csv')
    date_col = data.get('date_col', 'Order Date')
    target_col = data.get('target_col', 'Sales')
    periods = int(data.get('periods', 6))
    freq = data.get('freq', 'ME')
    yearly_seasonality = data.get('yearly_seasonality', True)
    weekly_seasonality = data.get('weekly_seasonality', False)
    daily_seasonality = data.get('daily_seasonality', False)

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        return jsonify({"error": f"File {filename} not found."}), 404

    try:
        # 1. Load and clean
        df_raw = pd.read_csv(file_path, encoding='latin1')
        df_clean = clean_custom_data(df_raw, date_col, target_col)
        
        if len(df_clean) < 10:
            return jsonify({"error": "Not enough valid data rows after cleaning (minimum 10 rows required)."}), 400

        # 2. Run Forecasting
        monthly_sales, forecast, future_forecast, model = forecast_sales(
            df_clean,
            date_col=date_col,
            target_col=target_col,
            periods=periods,
            freq=freq,
            yearly_seasonality=yearly_seasonality,
            weekly_seasonality=weekly_seasonality,
            daily_seasonality=daily_seasonality
        )

        # 3. Model evaluation
        merged_forecast = forecast[['ds', 'yhat']].iloc[:len(monthly_sales)]
        monthly_sales['Predicted_Sales'] = merged_forecast['yhat'].values
        
        mae, rmse = evaluate_model(
            monthly_sales['y'],
            monthly_sales['Predicted_Sales']
        )

        # Save output CSV files
        monthly_sales.to_csv(os.path.join(OUTPUTS_FOLDER, "forecast.csv"), index=False)
        future_forecast.to_csv(os.path.join(OUTPUTS_FOLDER, "future_forecast.csv"), index=False)

        # 4. Formulate JSON response
        # Prepare charts data:
        # History chart data: ds, y, yhat
        history_chart = []
        for idx, row in monthly_sales.iterrows():
            history_chart.append({
                "date": row['ds'].strftime('%Y-%m-%d') if isinstance(row['ds'], pd.Timestamp) else str(row['ds']),
                "actual": float(row['y']),
                "predicted": float(row['Predicted_Sales'])
            })
            
        # Forecast chart data: ds, yhat, yhat_lower, yhat_upper
        forecast_chart = []
        for idx, row in future_forecast.iterrows():
            forecast_chart.append({
                "date": row['ds'].strftime('%Y-%m-%d') if isinstance(row['ds'], pd.Timestamp) else str(row['ds']),
                "predicted": float(row['yhat']),
                "lower": float(row['yhat_lower']),
                "upper": float(row['yhat_upper'])
            })

        # Category and Region breakdown if columns exist
        category_breakdown = {}
        if 'Category' in df_clean.columns:
            category_data = df_clean.groupby('Category')[target_col].sum().reset_index()
            category_breakdown = dict(zip(category_data['Category'], category_data[target_col].astype(float)))
            
        region_breakdown = {}
        if 'Region' in df_clean.columns:
            region_data = df_clean.groupby('Region')[target_col].sum().reset_index()
            region_breakdown = dict(zip(region_data['Region'], region_data[target_col].astype(float)))

        # Extract seasonality component (yearly)
        seasonality_chart = []
        if yearly_seasonality and 'yearly' in forecast.columns:
            forecast['ds_dt'] = pd.to_datetime(forecast['ds'])
            forecast_sorted = forecast.sort_values('ds_dt')
            forecast_sorted['Month_Num'] = forecast_sorted['ds_dt'].dt.month
            monthly_season = forecast_sorted.groupby('Month_Num')['yearly'].mean().reset_index()
            
            month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            for idx, row in monthly_season.iterrows():
                m_idx = int(row['Month_Num']) - 1
                if 0 <= m_idx < 12:
                    seasonality_chart.append({
                        "month": month_names[m_idx],
                        "seasonality": float(row['yearly'])
                    })

        # Generate Business Insights
        total_historical = float(monthly_sales['y'].sum())
        avg_historical = float(monthly_sales['y'].mean())
        projected_total = float(future_forecast['yhat'].sum())
        projected_avg = float(future_forecast['yhat'].mean())
        pct_change = ((projected_avg - avg_historical) / avg_historical) * 100 if avg_historical > 0 else 0
        
        # Max month in forecast
        max_idx = future_forecast['yhat'].idxmax()
        max_forecast_row = future_forecast.loc[max_idx]
        max_forecast_val = float(max_forecast_row['yhat'])
        max_forecast_date = max_forecast_row['ds'].strftime('%B %Y') if isinstance(max_forecast_row['ds'], pd.Timestamp) else str(max_forecast_row['ds'])

        insights = [
            f"Overall Sales Trend: The forecast models suggest an average monthly demand of ${projected_avg:,.2f} for the upcoming {periods} months, representing a {abs(pct_change):.1f}% {'increase' if pct_change >= 0 else 'decrease'} compared to the historical monthly average (${avg_historical:,.2f}).",
            f"Peak Sales Alert: Future sales are projected to reach a maximum of ${max_forecast_val:,.2f} in {max_forecast_date}. Actionable Tip: Increase inventory levels by at least 20-30% two months prior to capture this surge and prevent stockouts.",
            "Inventory Planning: Keep safety stock buffers high during periods of wide confidence bands (shaded areas on the chart) to guard against high demand volatility.",
            "Cash Flow Management: Ensure you maintain cash reserves to support operational costs during forecasted dips, helping avoid short-term credit dependence."
        ]

        if category_breakdown:
            top_cat = max(category_breakdown, key=category_breakdown.get)
            top_cat_pct = (category_breakdown[top_cat] / sum(category_breakdown.values())) * 100
            insights.append(f"Revenue Drivers (Category): '{top_cat}' is your primary category, driving {top_cat_pct:.1f}% of total sales (${category_breakdown[top_cat]:,.2f}). Safeguard supply chains for this category's items.")

        if region_breakdown:
            top_region = max(region_breakdown, key=region_breakdown.get)
            insights.append(f"Revenue Drivers (Geography): The '{top_region}' region is leading in sales. Consider launching targeted promotions in secondary regions to balance revenue spread.")

        # Save insights text to file to remain compatible with evaluation structure
        with open(os.path.join(OUTPUTS_FOLDER, "business_insights.txt"), "w") as f_ins:
            f_ins.write("\n".join(insights))

        # Save evaluation metrics
        with open(os.path.join(OUTPUTS_FOLDER, "evaluation_metrics.txt"), "w") as f_ev:
            f_ev.write(f"Mean Absolute Error (MAE): {mae}\n")
            f_ev.write(f"Root Mean Squared Error (RMSE): {rmse}\n")

        return jsonify({
            "status": "success",
            "mae": float(mae),
            "rmse": float(rmse),
            "history_chart": history_chart,
            "forecast_chart": forecast_chart,
            "category_breakdown": category_breakdown,
            "region_breakdown": region_breakdown,
            "seasonality_chart": seasonality_chart,
            "insights": insights,
            "summary": {
                "total_historical": total_historical,
                "avg_historical": avg_historical,
                "projected_total": projected_total,
                "projected_avg": projected_avg,
                "pct_change": pct_change,
                "peak_month": max_forecast_date,
                "peak_value": max_forecast_val
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Forecasting model execution failed: {str(e)}"}), 500

if __name__ == '__main__':
    # Try default port 5000, if occupied Flask will report it or we can run on 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
