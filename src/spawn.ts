import { Roles } from "./constants";

const MIN_ENERGY_TO_RENEW = 50;
const MAX_TICKS_TO_RENEW = 1200;
const MIN_ENERGY_TO_SPAWN_HARVESTER = 300;
const MIN_HARVESTERS = 4;
let harvestersSpawned = 10;

export function spawnLoop(spawn: StructureSpawn) {
  //Verifica se algum creep esta precisando de reparo;
  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName];
    if (creep.memory.need_renew && spawn.store.getUsedCapacity(RESOURCE_ENERGY) > MIN_ENERGY_TO_RENEW) {
      creep.say("Renovando creep");
      if (spawn.renewCreep(creep) == 0) {
        if ((creep.ticksToLive ?? 0) >= MAX_TICKS_TO_RENEW) creep.memory.need_renew = false;
        return;
      } else break;
    }
  }

  if (verifyAndSpawnHarvester(spawn)) return;

  if (verifyAndSpawnUpgrader(spawn)) return;
  //TODO: faz o resto de acordo com importancia, como fazer estruturas e miliatres
}

//Retorna se spawnou algum
function verifyAndSpawnHarvester(spawn: StructureSpawn) {
  if (spawn.store[RESOURCE_ENERGY] < MIN_ENERGY_TO_SPAWN_HARVESTER) {
    return;
  }
  if (spawn.spawning) {
    console.log("SPAWNANDO!");
    return;
  }

  let harvesters = 0;
  for (const creep of Object.values(Game.creeps)) {
    if (creep.memory.role == Roles.HARVESTER) {
      harvesters++;
      if (harvesters >= MIN_HARVESTERS) {
        return false;
      }
    }
  }
  const harvesterName = "Harvester" + (harvestersSpawned + 1);
  spawn.room.visual.text("Spawnando " + harvesterName + "...", 30, 30);
  const spawnResult = spawn.spawnCreep(getHarvesterPartsToSpawn(spawn), harvesterName, {
    memory: { role: Roles.HARVESTER, need_renew: false, upgrading: false, }
  });
  if (spawnResult == ERR_NAME_EXISTS) {
    spawn.room.visual.text("ERRO! HARVESTER NOME COLISÃO!", 0, 30);
    return false;
  }
  if (spawnResult == ERR_NOT_ENOUGH_ENERGY) {
    spawn.room.visual.text("ERRO! Tentou criar harvester com mais energia disponivel!", 10, 30);
    return false;
  }

  harvestersSpawned++;
  console.log("Resultado spawn: " + spawnResult);
  return true;
}

//Retorna se spawnou algum
function verifyAndSpawnUpgrader(spawn: StructureSpawn) {
  if (spawn.store[RESOURCE_ENERGY] < MIN_ENERGY_TO_SPAWN_HARVESTER) {
    return;
  }
  if (spawn.spawning) {
    console.log("SPAWNANDO!");
    return;
  }

  let harvesters = 0;
  for (const creep of Object.values(Game.creeps)) {
    if (creep.memory.role == Roles.UPGRADER) {
      harvesters++;
      if (harvesters >= 3) {
        return false;
      }
    }
  }
  const harvesterName = "Upgrader" + (harvesters + 2);
  spawn.room.visual.text("Spawnando " + harvesterName + "...", 30, 30);
  const spawnResult = spawn.spawnCreep([WORK, CARRY, CARRY, MOVE], harvesterName, {
    memory: { role: Roles.UPGRADER, need_renew: false, upgrading: false }
  });

  if (spawnResult == ERR_NAME_EXISTS) {
    spawn.room.visual.text("ERRO! UPGRADER NOME COLISÃO!", 0, 30);
    return false;
  }
  if (spawnResult == ERR_NOT_ENOUGH_ENERGY) {
    spawn.room.visual.text("ERRO! Tentou criar upgrader com mais energia disponivel!", 10, 30);
    return false;
  }

  console.log("Resultado spawn: " + spawnResult);
  return true;
}

function getHarvesterPartsToSpawn(spawn: StructureSpawn) {
  //quanto mais harvesters tiver, mais partes coloca, e quanto mais partes os mais velhos tiver, mais partes colocar;
  if (spawn.store[RESOURCE_ENERGY] > 350) return [WORK, WORK, CARRY, CARRY, MOVE];
  else return [WORK, CARRY, MOVE];
}
