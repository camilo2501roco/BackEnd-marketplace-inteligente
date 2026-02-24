import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Marketplace API",
      version: "1.0.0",
      description: "API para marketplace con autenticación JWT",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  // Aquí le decimos dónde están las anotaciones de los endpoints
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
