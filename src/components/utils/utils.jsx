// Utility functions for generating random data

export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomFloat = (min, max) => {
  return Math.random() * (max - min) + min;
};

export const randomDate = (start, end) => {
  const startTime = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const endTime = end instanceof Date ? end.getTime() : new Date(end).getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
};

export const sample = (array) => {
  if (!array || !Array.isArray(array) || array.length === 0) {
    return null;
  }
  return array[Math.floor(Math.random() * array.length)];
};