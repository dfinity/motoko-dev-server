import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = express.Router();

const specs = swaggerJSDoc({
    swaggerDefinition: {
        info: {
            title: 'Motoko Dev Server',
            version: '1.0.0',
            description: 'API documentation',
        },
    },
    apis: ['swagger.yaml'],
});
router.use('/swagger', swaggerUi.serve, swaggerUi.setup(specs));

export default router;
