export interface OrgRecord {
  'Store ID': string
  'Location Code': string
  'Store Name Thai': string
  'Store Name': string
  'AGM Name': string
  'AGM ZONE': string
  'GPM Name': string
  'Store Manager Name': string
  position: string
  'Province': string
  'SM Phone': string
  'Store Phone': string
  'Mobile Phone': string       // kept for backward compat
  'Yr of Service in TL': string
  'Service in Position': string
  'Image URL': string
  _imageFileId?: string
  _localImage?: string
}

export interface AgmRecord {
  'AGM Name': string
  'AGM ZONE': string
  'Mobile Phone': string
  Email: string
  'Image URL': string
  Remark: string
  _imageFileId?: string
  _localImage?: string
}

export type PageId = 'dash' | 'org' | 'agm' | 'data'
