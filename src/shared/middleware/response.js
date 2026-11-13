export const successResponse = (
    message,
    data = null
  ) => ({
    status: true,
    message,
    data,
  });
  
  export const errorResponse = (
    message,
    data = null
  ) => ({
    status: false,
    message,
    data,
  });