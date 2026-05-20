import matplotlib.pyplot as plt
import seaborn as sns


# ==========================================
# MONTHLY SALES TREND
# ==========================================

def sales_trend(df):

    monthly_sales = df.resample(
        'ME',
        on='Order Date'
    )['Sales'].sum()

    plt.figure(figsize=(14, 6))

    plt.plot(
        monthly_sales.index,
        monthly_sales.values,
        color='blue',
        linewidth=2
    )

    plt.title("Monthly Sales Trend")
    plt.xlabel("Date")
    plt.ylabel("Sales")

    plt.grid(True)

    plt.tight_layout()

    plt.savefig(
        "images/monthly_sales_trend.png"
    )

    plt.close()


# ==========================================
# CATEGORY-WISE SALES
# ==========================================

def category_sales(df):

    category_data = df.groupby(
        'Category'
    )['Sales'].sum().reset_index()

    plt.figure(figsize=(8, 5))

    sns.barplot(
        x='Category',
        y='Sales',
        data=category_data
    )

    plt.title("Category-wise Sales")
    plt.xlabel("Category")
    plt.ylabel("Total Sales")

    plt.tight_layout()

    plt.savefig(
        "images/category_sales.png"
    )

    plt.close()


# ==========================================
# REGION-WISE SALES
# ==========================================

def region_sales(df):

    region_data = df.groupby(
        'Region'
    )['Sales'].sum().reset_index()

    plt.figure(figsize=(10, 5))

    sns.barplot(
        x='Region',
        y='Sales',
        data=region_data
    )

    plt.title("Region-wise Sales")
    plt.xlabel("Region")
    plt.ylabel("Total Sales")

    plt.tight_layout()

    plt.savefig(
        "images/region_sales.png"
    )

    plt.close()


# ==========================================
# FORECAST PLOT
# ==========================================

def forecast_plot(forecast_df):

    plt.figure(figsize=(14, 6))

    plt.plot(
        forecast_df['ds'],
        forecast_df['yhat'],
        label='Forecasted Sales',
        linewidth=2
    )

    plt.title("Future Sales Forecast")
    plt.xlabel("Date")
    plt.ylabel("Sales")

    plt.legend()

    plt.grid(True)

    plt.tight_layout()

    plt.savefig(
        "images/final_forecast.png"
    )

    plt.close()