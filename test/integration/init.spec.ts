import { Options } from 'amqplib';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { config } from 'dotenv';

config();
chai.use(chaiAsPromised);

export const rabbitOptions: Options.Connect = {
  hostname: process.env.RABBIT_HOST,
  username: process.env.RABBIT_USERNAME,
  password: process.env.RABBIT_PASSWORD
};
