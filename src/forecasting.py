from prophet import Prophet
import pandas as pd


def forecast_sales(df):

    # ==========================================
    # MONTHLY SALES AGGREGATION
    # ==========================================

    monthly_sales = df.resample(
        'ME',
        on='Order Date'
    )['Sales'].sum().reset_index()

    # ==========================================
    # RENAME COLUMNS FOR PROPHET
    # ==========================================

    monthly_sales.columns = ['ds', 'y']

    # ==========================================
    # INITIALIZE MODEL
    # ==========================================

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False
    )

    # ==========================================
    # TRAIN MODEL
    # ==========================================

    model.fit(monthly_sales)

    # ==========================================
    # CREATE FUTURE DATES
    # ==========================================

    future = model.make_future_dataframe(
        periods=6,
        freq='ME'
    )

    # ==========================================
    # GENERATE FORECASTS
    # ==========================================

    forecast = model.predict(future)

    # ==========================================
    # SAVE FORECAST OUTPUT
    # ==========================================

    forecast_output = forecast[
        ['ds', 'yhat', 'yhat_lower', 'yhat_upper']
    ]

    future_forecast = forecast_output.tail(6)

    return (
        monthly_sales,
        forecast,
        future_forecast,
        model
    )