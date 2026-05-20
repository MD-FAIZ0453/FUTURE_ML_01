from data_preprocessing import load_and_clean_data

from eda import (
    sales_trend,
    category_sales,
    region_sales,
    forecast_plot
)

from forecasting import forecast_sales

from evaluation import evaluate_model

from insights import generate_insights

import matplotlib.pyplot as plt


def main():

    print("\n========================================")
    print(" SALES FORECASTING PROJECT STARTED ")
    print("========================================")

    # ==========================================
    # LOAD AND CLEAN DATA
    # ==========================================

    df = load_and_clean_data(
        "data/raw/Sample-Superstore.csv"
    )

    print("\nDataset Loaded Successfully")
    print(df.head())

    # ==========================================
    # EXPLORATORY DATA ANALYSIS
    # ==========================================

    sales_trend(df)

    category_sales(df)

    region_sales(df)

    print("\nEDA charts saved successfully.")

    # ==========================================
    # FORECASTING
    # ==========================================

    (
        monthly_sales,
        forecast,
        future_forecast,
        model
    ) = forecast_sales(df)

    # ==========================================
    # MERGE ACTUAL + PREDICTED VALUES
    # ==========================================

    merged_forecast = forecast[
        ['ds', 'yhat']
    ].iloc[:len(monthly_sales)]

    monthly_sales['Predicted_Sales'] = (
        merged_forecast['yhat'].values
    )

    # ==========================================
    # MODEL EVALUATION
    # ==========================================

    mae, rmse = evaluate_model(
        monthly_sales['y'],
        monthly_sales['Predicted_Sales']
    )

    print(f"\nMean Absolute Error (MAE): {mae}")

    print(f"Root Mean Squared Error (RMSE): {rmse}")

    # ==========================================
    # FORECAST VISUALIZATION
    # ==========================================

    forecast_plot(forecast)

    # ==========================================
    # PROPHET COMPONENT PLOTS
    # ==========================================

    model.plot_components(forecast)

    plt.tight_layout()

    plt.savefig(
        "images/forecast_components.png"
    )

    plt.close()

    print("\nForecast charts saved successfully.")

    # ==========================================
    # SAVE FORECAST OUTPUTS
    # ==========================================

    monthly_sales.to_csv(
        "outputs/forecast.csv",
        index=False
    )

    future_forecast.to_csv(
        "outputs/future_forecast.csv",
        index=False
    )

    # ==========================================
    # SAVE EVALUATION METRICS
    # ==========================================

    with open(
        "outputs/evaluation_metrics.txt",
        "w"
    ) as file:

        file.write(
            f"Mean Absolute Error (MAE): {mae}\n"
        )

        file.write(
            f"Root Mean Squared Error (RMSE): {rmse}\n"
        )

    # ==========================================
    # GENERATE BUSINESS INSIGHTS
    # ==========================================

    generate_insights()

    # ==========================================
    # FINAL STATUS
    # ==========================================

    print("\nForecast output saved successfully.")

    print("Future forecast saved successfully.")

    print("Business insights generated successfully.")

    print("\n========================================")
    print(" PROJECT EXECUTION COMPLETED ")
    print("========================================")


if __name__ == "__main__":

    main()