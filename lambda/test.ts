
import {EC2} from 'aws-sdk';


async function tslambda(event:any):Promise<any>{
const ec2 = new EC2();
const data = await ec2.describeInstances((err) => {
return{
    statusCode: 500,
    body: err
}
} , 

).promise();
return{
    statusCode: 200,
    body: JSON.stringify(data),
}
}


export {tslambda};