export const sendSuccess = (res, message, data = null, statusCode = 200, meta = null) => {
  const response = {
    success: true,
    message,
    data
  };

  if (meta && typeof meta === 'object') {
    Object.assign(response, meta);
  }

  return res.status(statusCode).json(response);
};

export const sendError = (res, message, error = null, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error
  });
};
