import { createTRPCRouter } from '../../create-context';
import { duplicateCheckerProcedure } from './duplicateChecker';

export default createTRPCRouter({
  checkDuplicates: duplicateCheckerProcedure,
});