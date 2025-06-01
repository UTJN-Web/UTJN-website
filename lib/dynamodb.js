import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION;

const client = new DynamoDBClient({ region: REGION });

export const ddbDocClient = DynamoDBDocumentClient.from(client);