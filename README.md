Sales Forecasting Project using Machine Learning
Project Overview

This project focuses on forecasting future sales using historical business data from the Superstore dataset.
The system performs:

Data cleaning and preprocessing
Exploratory Data Analysis (EDA)
Time-series forecasting using Facebook Prophet
Model evaluation
Business insight generation
Visualization of forecast trends

The objective is to help businesses understand historical sales behavior and predict future demand for better decision-making.

Project Objectives
Analyze historical sales patterns
Identify seasonal trends
Forecast future monthly sales
Evaluate forecasting performance
Generate business-friendly insights
Visualize trends and predictions clearly
Technologies Used
Python
Pandas
NumPy
Matplotlib
Seaborn
Prophet (Facebook Prophet)
Scikit-learn
Project Structure
FUTURE_ML_01/
│
├── data/
│   ├── raw/
│   │   └── Sample-Superstore.csv
│   └── processed/
│
├── images/
│   ├── category_sales.png
│   ├── region_sales.png
│   ├── sales_trend.png
│   ├── monthly_sales_trend.png
│   ├── forecast.png
│   ├── final_forecast.png
│   └── forecast_components.png
│
├── outputs/
│   ├── business_insights.txt
│   ├── evaluation_metrics.txt
│   ├── forecast.csv
│   └── future_forecast.csv
│
├── src/
│   ├── data_preprocessing.py
│   ├── eda.py
│   ├── forecasting.py
│   ├── evaluation.py
│   ├── insights.py
│   └── main.py
│
├── requirements.txt
└── README.md
Workflow
1. Data Preprocessing

The dataset is cleaned and transformed by:

Removing duplicate records
Converting date columns into datetime format
Sorting records by order date
Creating time-based features:
Year
Month
Quarter
Day of Week
2. Exploratory Data Analysis (EDA)

The following visualizations are generated:

Sales Trend Over Time

Shows how sales fluctuate across the timeline.

Category-wise Sales

Compares sales contribution from:

Furniture
Office Supplies
Technology
Region-wise Sales

Compares sales performance across:

Central
East
South
West
Monthly Sales Trend

Displays monthly aggregated sales behavior.

Forecasting Model

The project uses Facebook Prophet for time-series forecasting.

Why Prophet?

Handles seasonality effectively
Captures trends automatically
Works well with business time-series data
Easy future forecasting support
Forecasting Process
Monthly sales aggregation
Prophet model training
Future month generation
Forecast prediction
Visualization of forecast results
Trend and seasonality analysis
Model Evaluation

The forecasting model is evaluated using:

Mean Absolute Error (MAE)

Measures average prediction error.

Root Mean Squared Error (RMSE)

Measures overall prediction performance while penalizing large errors.

Final Model Performance
Mean Absolute Error (MAE): 5665.15

Root Mean Squared Error (RMSE): 7260.16

The model demonstrates acceptable forecasting accuracy for business sales prediction tasks.

Business Insights

The analysis generated the following insights:

Technology category generates the highest revenue among all product categories.
Western region contributes the highest overall sales performance.
Monthly sales show strong seasonal fluctuations throughout the year.
Forecasting indicates continued upward sales growth over future months.
Businesses should prepare inventory and logistics before peak sales periods.
Visual Outputs
Category-wise Sales
Highlights the best-performing product category.
Region-wise Sales
Shows the strongest performing sales regions.
Monthly Sales Trend
Identifies seasonality and fluctuations.
Forecast Visualization
Compares historical sales with predicted future sales.
Forecast Components
Displays:
Trend
Yearly seasonality