import Joi from 'joi';

export function validateQuery(query: any, schema: Joi.Schema) {
  const { error, value } = schema.validate(query);
  
  if (error) {
    throw {
      name: 'ValidationError',
      message: error.details[0].message,
      statusCode: 400
    };
  }
  
  return value;
}