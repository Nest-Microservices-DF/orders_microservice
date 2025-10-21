import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrderItemDto } from "./order-item.dto";

export class CreateOrderDto {
    reduce(arg0: (acc: any, orderItem: any) => void, arg1: number) {
      throw new Error('Method not implemented.');
    }

    /*@IsNumber()
    @IsPositive()
    totalAmount: number;

    @IsNumber()
    @IsPositive()
    totalItems: number;

    @IsEnum(OrderStatusList, {
        message: `Posible status values are ${ OrderStatusList }`
    })
    @IsOptional()
    status: OrderStatus = OrderStatus.PENDING;

    @IsBoolean()
    @IsOptional()
    paid: boolean = false;*/
    
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type( () => OrderItemDto )
    items: OrderItemDto[]

}
