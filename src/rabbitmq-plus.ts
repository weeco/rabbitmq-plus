import { connect, Connection, Options } from 'amqplib';

export class RabbitMQPlus {
  // tslint:disable-next-line:no-empty
  private constructor(public connection: Connection) {}

  public static async CREATE(connectOptions: Options.Connect): Promise<RabbitMQPlus> {
    const connection: Connection = await connect(connectOptions);

    return new RabbitMQPlus(connection);
  }
}
