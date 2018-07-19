import { expect } from 'chai';
import { describe, it } from 'mocha';
import { RabbitMQPlus } from '../../src/index';
import { rabbitOptions } from './init.spec';

describe('Connection', () => {
  // tslint:disable-next-line:mocha-no-side-effect-code
  it('should throw an exception after 6s trying to connect', async () => {
    rabbitOptions.port = 9003;
    const client: RabbitMQPlus = await RabbitMQPlus.CREATE(rabbitOptions);
    expect(client).to.be.an('object');
    await expect(RabbitMQPlus.CREATE(rabbitOptions)).to.be.rejected;
  }).timeout(7 * 1000);
});
