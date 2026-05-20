from sklearn.metrics import mean_absolute_error
from sklearn.metrics import mean_squared_error
import numpy as np


def evaluate_model(actual, predicted):

    mae = mean_absolute_error(actual, predicted)

    rmse = np.sqrt(
        mean_squared_error(actual, predicted)
    )

    return mae, rmse