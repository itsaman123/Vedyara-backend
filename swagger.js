// swagger.js
// const swaggerAutogen = require('swagger-autogen')();
import swaggerAutogen from 'swagger-autogen'

const swaggerAutogenerator = swaggerAutogen()

const doc = {
  info: {
    title: 'My API',
    description: 'Auto-generated docs',
  },
  host: 'localhost:3000',
};

const outputFile = './swagger-output.json';
const routes = ['./index.js'];

swaggerAutogenerator(outputFile, routes, doc);