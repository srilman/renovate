import type { ProgrammingLanguage } from '../../../constants';
import { CondaDatasource } from '../../datasource/conda';
import { PypiDatasource } from '../../datasource/pypi';
import * as pep440Versioning from '../../versioning/pep440';

export { extractPackageFile } from './extract';


export const supportedDatasources = [
  CondaDatasource.id,
  PypiDatasource.id,
];

export const language: ProgrammingLanguage = 'python';
export const supportsLockFileMaintenance = true;

export const defaultConfig = {
  enabled: false,
  fileMatch: ['(^|/)environment\\.ya?ml$'],
  versioning: pep440Versioning.id,
};

