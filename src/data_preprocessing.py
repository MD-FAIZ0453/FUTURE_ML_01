import pandas as pd


def load_and_clean_data(file_path):

    # ==========================================
    # LOAD DATASET
    # ==========================================

    df = pd.read_csv(
        file_path,
        encoding='latin1'
    )

    # ==========================================
    # REMOVE DUPLICATES
    # ==========================================

    df.drop_duplicates(inplace=True)

    # ==========================================
    # HANDLE MISSING VALUES
    # ==========================================

    df.dropna(inplace=True)

    # ==========================================
    # CONVERT DATE COLUMN
    # ==========================================

    df['Order Date'] = pd.to_datetime(
        df['Order Date']
    )

    # ==========================================
    # SORT DATA
    # ==========================================

    df = df.sort_values(
        'Order Date'
    )

    # ==========================================
    # TIME-BASED FEATURES
    # ==========================================

    df['Year'] = df['Order Date'].dt.year
    df['Month'] = df['Order Date'].dt.month
    df['Quarter'] = df['Order Date'].dt.quarter
    df['DayOfWeek'] = df['Order Date'].dt.day_name()

    return df