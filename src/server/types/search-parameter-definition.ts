export interface SearchParameterDefinition {
    name: string;

    type?: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'LIST' | 'DATE'; // defaults to STRING
    required?: boolean;
    default?: string | number | boolean | string[] | Date;
}
