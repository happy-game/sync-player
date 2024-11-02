import { Sequelize } from 'sequelize';
import { dbConfig } from '../config/database';

const sequelize = new Sequelize(dbConfig);

export default sequelize; 