import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';

export interface HitCounterProps{
    downstream: lambda.IFunction;
}

export class HitCounter extends cdk.Construct{

    public readonly handler: lambda.Function;
    constructor(scope: cdk.Construct, id: string, props: HitCounterProps){
        super(scope, id);
        const table = new dynamodb.Table(this, 'Htis', {
            partitionKey:{
    name:'path',
    type: dynamodb.AttributeType.STRING
            }
        });

    this.handler = new lambda.Function(this, 'HitCounterHandler', {
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'hitcounter.handler',
        code: lambda.Code.fromAsset('lambda'),
        environment: {
            DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
            HITS_TABLE_NAME: table.tableName,
        }
    });
    table.grantReadWriteData(this.handler);
    props.downstream.grantInvoke(this.handler);
    }
    
   

    

    
    
}