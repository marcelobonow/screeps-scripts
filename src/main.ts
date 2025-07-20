import { ErrorMapper } from "utils/ErrorMapper";
import { creepLoop } from "./creeper";
import { spawnLoop } from "./spawn";
import { Roles } from "./constants";

declare global {

  enum CreepStates {
    NONE = 0,
    RENEW = 1
  }

  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: Roles;
    need_renew:boolean;
    transferring: boolean;
    manual: boolean;
  }


  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
    }
  }
}


console.log("Rodando versão: " ,__APP_VERSION__);

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
  // Automatically delete memory of missing creeps
  // for (const name in Memory.creeps) {
  //   if (!(name in Game.creeps)) {
  //     delete Memory.creeps[name];
  //   }
  // }
  for(const creep of Object.values(Game.creeps))
    creepLoop(creep);

  for(const spawn of Object.values(Game.spawns))
    spawnLoop(spawn);
});
