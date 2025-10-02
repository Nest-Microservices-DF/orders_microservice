import { IsEnum, IsUUID } from "class-validator";
import { OrderStatus } from "generated/prisma";
import { OrderStatusList } from "../enum/order.enum";

export class ChangeOrderStatusDto {
    
    @IsUUID()
    id: string;

    @IsEnum( OrderStatusList, {
        message: `Valid status are ${ OrderStatusList }`
    })
    status: OrderStatus;

}