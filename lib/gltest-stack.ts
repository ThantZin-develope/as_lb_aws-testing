import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as lambdanode from '@aws-cdk/aws-lambda-nodejs';
import { HitCounter } from './hitcounter';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as autoscale from '@aws-cdk/aws-autoscaling';
import * as loadbalancer from '@aws-cdk/aws-elasticloadbalancingv2';;
import * as path from 'path';
import { AmazonLinuxGeneration, CfnInstance, InitCommand, Instance, InstanceClass, InstanceSize, SubnetType } from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import { BuiltInAttributes, Ec2Service } from '@aws-cdk/aws-ecs';
import { KeyPair } from 'cdk-ec2-key-pair';
import { Asset } from '@aws-cdk/aws-s3-assets';
import { CfnRefElement, CfnResource, Resource, Stack } from '@aws-cdk/core';
import * as cfninc from '@aws-cdk/cloudformation-include';
import * as s3 from '@aws-cdk/aws-s3';
import { CfnInclude } from '@aws-cdk/cloudformation-include';
import { EC2 } from 'aws-sdk';
import { PolicyStatement } from '@aws-cdk/aws-iam';
import { GatewayVpcEndpointAwsService } from '@aws-cdk/aws-ec2';
import { IpAddressType, ListenerAction, ListenerCondition, TargetType } from '@aws-cdk/aws-elasticloadbalancingv2';
import { mixedTypeAnnotation } from '@babel/types';
import { WeightedTargets } from 'aws-sdk/clients/appmesh';
export class GltestStack extends cdk.Stack {

  // public readonly myec2Instnace: ec2.Instance;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //creating custom vpc 
    const mycdkvpc = new ec2.Vpc(this, 'mycdkvpc', {
      cidr: '10.0.0.0/16',
      enableDnsHostnames: true,
      natGateways:1,
      enableDnsSupport: true,
      natGatewayProvider: ec2.NatProvider.gateway(),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'mypublicsubnet01',
          subnetType: ec2.SubnetType.PUBLIC
        }
      ],   
      
    });
    const commonSubnetSelection: ec2.SubnetSelection = {
      subnets: mycdkvpc.publicSubnets
    }
    const subnetSelectoion1 : ec2.SubnetSelection = {
      subnets: [mycdkvpc.publicSubnets[0]
    ]
    };

    const subnetSelectoion2: ec2.SubnetSelection = {
      subnets: [
        mycdkvpc.publicSubnets[1]
      ]
    };

    console.log(mycdkvpc.publicSubnets[1].availabilityZone);

    //create custom security group for my vpc
    const mysecuritygp = new ec2.SecurityGroup(this , 'MySecurityGroup', {
      allowAllOutbound: true,
      vpc: mycdkvpc,
      securityGroupName: 'MyCustomSecurityGroup'

    });
    // add inbbound rules
    mysecuritygp.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH Access' );
    mysecuritygp.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'Allow All Traffic Access');
    mysecuritygp.addIngressRule(ec2.Peer.anyIpv4() , ec2.Port.tcp(80), 'Open Port 80 in order to access Http');


    const myautoscaling1 = new autoscale.AutoScalingGroup(this , 'MyCustomAutoScalingGroup', {
      vpc: mycdkvpc,
      securityGroup: mysecuritygp,
      instanceType: ec2.InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux({
generation:AmazonLinuxGeneration.AMAZON_LINUX_2
      }),
     minCapacity: 1,
     maxCapacity: 3,
     desiredCapacity: 2,
     keyName: 'test',
     allowAllOutbound: true,
     associatePublicIpAddress: true,
     vpcSubnets: subnetSelectoion1
    }
    );
    myautoscaling1.addUserData(
      '#!/bin/bash', 'sudo su', 'yum update -y', 'yum install -y httpd','systemctl start httpd','systemctl enable httpd',
      'cd /var/www/html/', 'mkdir server1' , 'echo "<h1>My Web Server1 $(hostname -f)</h1>" > /var/www/html/server1/index.html'
    );
    myautoscaling1.scaleOnSchedule('morning schedule', {
schedule: autoscale.Schedule.cron({hour: '1'}),
desiredCapacity:2
    });


    const myautoscaling2 = new autoscale.AutoScalingGroup(this , 'MyCustomAutoScalingGroup2', {
      vpc: mycdkvpc,
      securityGroup: mysecuritygp,
      instanceType: ec2.InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux({
generation:AmazonLinuxGeneration.AMAZON_LINUX_2
      }),
     minCapacity: 1,
     maxCapacity: 3,
     desiredCapacity: 2,
     keyName: 'test',
     allowAllOutbound: true,
     associatePublicIpAddress: true,
     vpcSubnets: subnetSelectoion2
    }
    );
    console.log('testing something changes');
    myautoscaling2.addUserData(
      '#!/bin/bash', 'sudo su', 'yum update -y', 'yum install -y httpd','systemctl start httpd','systemctl enable httpd',
      'cd /var/www/html/', 'mkdir server2' , 'echo "<h1>My Web Server2 $(hostname -f)</h1>" > /var/www/html/server2/index.html'
    );
    myautoscaling2.scaleOnSchedule('morning schedule', {
schedule: autoscale.Schedule.cron({hour: '1'}),
desiredCapacity:2
    });


     const myapploadbalancer = new loadbalancer.ApplicationLoadBalancer(this , 'MyCustomAppLoadBalancer', {
       securityGroup: mysecuritygp,
       http2Enabled: true,
       ipAddressType: IpAddressType.IPV4,
       vpc: mycdkvpc,
       vpcSubnets: commonSubnetSelection,
       internetFacing: true,
       
     });
    const listener =   myapploadbalancer.addListener('port 80 listener', {
       port: 80,
       open: true,
       
     });
     const mytarget1 = new loadbalancer.ApplicationTargetGroup(this , 'mytarget1' , {
      vpc: mycdkvpc,
      port: 80,
      targetType: TargetType.INSTANCE,
      healthCheck: {
        path: '/server1/index.html',
      }
      ,
           });
      
           const mytarget2 = new loadbalancer.ApplicationTargetGroup(this , 'mytarget2' , {
            vpc: mycdkvpc,
            port: 80,
            targetType: TargetType.INSTANCE,
            healthCheck: {
              path: '/server2/index.html',
            }
            ,
                 });

     listener.addTargetGroups('My TargetGP', {
      targetGroups: [mytarget1]
    });
    listener.addTargetGroups('My Next Target', {
      targetGroups: [mytarget2]
    });
   
  

   
     myautoscaling1.attachToApplicationTargetGroup(mytarget1);
     myautoscaling2.attachToApplicationTargetGroup(mytarget2);
    //  myautoscaling1.attachToApplicationTargetGroup(mytarget2);
    listener.addAction('ForTarget1', {
      priority: 45,
      conditions: [
        ListenerCondition.pathPatterns(['/server1/']),
      ],
      action: ListenerAction.forward(
 [mytarget1]
      )
    });
    listener.addAction('ForTarget2', {
      priority: 55,
      conditions: [
        ListenerCondition.pathPatterns(['/server2/']),
      ],
      action: ListenerAction.forward(
 [mytarget2]
      )
    });
 
     
  }
}
