from prophet import Prophet
import pandas as pd


def forecast_sales(df, date_col='Order Date', target_col='Sales', periods=6, freq='ME', yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False):

    # ==========================================
    # MONTHLY SALES AGGREGATION
    # ==========================================

    monthly_sales = df.resample(
        freq,
        on=date_col
    )[target_col].sum().reset_index()

    # ==========================================
    # RENAME COLUMNS FOR PROPHET
    # ==========================================

    monthly_sales.columns = ['ds', 'y']

    # ==========================================
    # INITIALIZE MODEL
    # ==========================================

    model = Prophet(
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=weekly_seasonality,
        daily_seasonality=daily_seasonality
    )

    # ==========================================
    # TRAIN MODEL
    # ==========================================

    model.fit(monthly_sales)

    # ==========================================
    # CREATE FUTURE DATES
    # ==========================================

    future = model.make_future_dataframe(
        periods=periods,
        freq=freq
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

    future_forecast = forecast_output.tail(periods)

    return (
        monthly_sales,
        forecast,
        future_forecast,
        model
    )