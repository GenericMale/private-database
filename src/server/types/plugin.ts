import {SearchParameterDefinition} from './search-parameter-definition';
import {DetailResult} from './detail-result';
import {SearchParameters} from './search-parameters';
import {SearchResult} from './search-result';

/**
 * @swagger
 *
 * definitions:
 *   Plugin:
 *     type: object
 *     properties:
 *       name:
 *         type: string
 *       label:
 *         type: string
 *       searchParameters:
 *         type: array
 *         items:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             label:
 *               type: string
 *             type:
 *               type: string
 *               enum: [STRING, NUMBER, BOOLEAN, LIST, DATE]
 *             required:
 *               type: boolean
 *             default:
 *               oneOf:
 *                 - type: string
 *                 - type: integer
 *                 - type: boolean
 *                 - type: array
 *                   items:
 *                     type: string
 */
export interface Plugin {
    name?: string;
    label: string;
    skipResults?: boolean;

    // TODO: replace by generated json schema
    searchParameters: SearchParameterDefinition[];

    search(params: SearchParameters): Promise<SearchResult[]>;

    getDetails(searchResult: SearchResult): Promise<DetailResult>;
}
