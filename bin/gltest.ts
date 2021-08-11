#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { GltestStack } from '../lib/gltest-stack';
import { WithMyEc2Instance } from '../lib/my-stack2';

const app = new cdk.App();
 new GltestStack(app, 'Stack1', {
});

// new WithMyEc2Instance(app, 'Stack2', {
//     myec2Instance: myec2Instnace
// })
