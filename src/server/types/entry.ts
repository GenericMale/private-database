export interface Entry {
    $entry: string;
    [key: string]: string | number | boolean | string[] | Date;
}
