
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import * as api from '@aws-cdk/aws-apigateway';
import { ApiDefinition } from '@aws-cdk/aws-apigateway';
export interface WithMyEc2InstnaceProps extends cdk.StackProps{
    myec2Instance:ec2.Instance;
} 

export class WithMyEc2Instance extends cdk.Stack{

    constructor(scope: cdk.Construct, id: string, props: WithMyEc2InstnaceProps){
        super(scope, id, props);

        const mylambda = new lambda.Function(this , 'MyLambdaFunction', {
runtime:lambda.Runtime.NODEJS_14_X,
code: lambda.Code.fromAsset('lambda'),
handler: 'hello.handler',
  environment: {
    INSTANCE: JSON.stringify({instanceId:props.myec2Instance.instanceId, publicIpAddress: props.myec2Instance.instancePublicIp, dnsName: props.myec2Instance.instancePublicDnsName})
  }
        });

        const api_gateway = new api.LambdaRestApi(this, 'APIGateway', {
handler:mylambda
        });
    }
}