import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '../../generated/prisma';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrderService');

  constructor(
    @Inject(NATS_SERVICE) private readonly productsClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect(); 
    this.logger.log('BD connected');
  }

  async create(createOrderDto: CreateOrderDto) {
    try {

      const productsIds = createOrderDto.items.map( item => item.productId );
      const products: any[] = await firstValueFrom(
        this.productsClient.send({ cmd: 'validate_products' }, productsIds)
      );

      const totalAmount = createOrderDto.items.reduce( (acc, orderItem) => {
        const price = products.find( 
          product  => product.id === orderItem.productId 
        ).price;
        return price * orderItem.quantity;
      }, 0 );

      const totalItems = createOrderDto.items.reduce( (acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0 );

      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          orderItem: {
            createMany: {
              data: createOrderDto.items.map( (orderItem) => ({
                price: products.find( 
                  product => product.id === orderItem.productId 
                ).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              }))
            }
          }
        },
        include: {
          orderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      });

      return {
        ...order,
        orderItem: order.orderItem.map( (orderItem) => ({
          ...orderItem,
          name: products.find( product => product.id === orderItem.productId ).name
        }) )
      };

    } catch (error) {
      throw new RpcException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: 'Check logs'
        }
      );
    }
    
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page, limit, status } = orderPaginationDto;

    const totalPages = await this.order.count({
      where: {
        status: status
      }
    });

    const lastPage = Math.ceil( totalPages/limit );

    return {
      data: await this.order.findMany({
        skip: ( page - 1 ) * limit,
        take: limit,
        where: {
          status: status
        }
      }),
      meta: {
        total: totalPages,
        page: page,
        lastPage: lastPage,
      }
    }
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        orderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true
          }
        }
      }
    });

    if(!order) {
      throw new RpcException({
        message: `Order with id ${id} not found`,
        status: HttpStatus.NOT_FOUND
      });
    }

    const productsId = order.orderItem.map( orderItem => orderItem.productId );
    const products: any[] = await firstValueFrom(
      this.productsClient.send({ cmd: 'validate_products' }, productsId)
    );

    return { 
      ...order,
      orderItem: order.orderItem.map( orderItem => ({
        ...orderItem,
        name: products.find( product => product.id === orderItem.productId ).name
      }) )
    };

  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    if( order.status === status ) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status }
    });

  }

}
