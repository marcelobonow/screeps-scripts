import { collectorPrefix, harvesterPrefix, moverPrefix, Roles, upgraderPrefix } from "./constants";
import { getExtensionEnergyInRoom } from "./extensions";

export const MIN_ENERGY_TO_RENEW = 50;
const MAX_TICKS_TO_RENEW = 1200;
const MIN_ENERGY_TO_SPAWN_HARVESTER = 300;
const MIN_ENERGY_TO_SPAWN_COLLECTOR = 500;
const MIN_ENERGY_TO_SPAWN_MOVER = 500;
const MAX_HARVESTERS = 1;
const MAX_COLLECTORS = 2;
const MAX_MOVERS = 2;

export function getSpawnEnergyAvailable(spawn: StructureSpawn) {
  if ((spawn.room.controller?.level ?? 0) < 2)
    return spawn.store.energy;
  else
    return spawn.store[RESOURCE_ENERGY] + getExtensionEnergyInRoom(spawn.room);
}


export function spawnLoop(spawn: StructureSpawn) {

  if (spawn.spawning)
    return;

  //Verifica se algum creep esta precisando de reparo;
  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName];
    if (creep.memory.need_renew && getSpawnEnergyAvailable(spawn) > MIN_ENERGY_TO_RENEW) {
      creep.say("sendo renovado");
      const renewResult = spawn.renewCreep(creep);
      if ((creep.ticksToLive ?? 0) >= MAX_TICKS_TO_RENEW) creep.memory.need_renew = false;
      if (renewResult == 0) {
        return;
      } else {
        if (renewResult == ERR_FULL) {
          creep.memory.need_renew = false;
          continue;
        }
        else if (renewResult == ERR_NOT_IN_RANGE) {
          creep.moveTo(spawn);
          continue;
        }
        else {
          console.log("[Spawn] Erro renovando: " + renewResult);
          break;
        }
      }
    }
  }

  ///Harvest é o que precisa de menos energia, mas se mudar, trocar aqui
  if (spawn.energy < MIN_ENERGY_TO_SPAWN_HARVESTER)
    return;

  if (verifyAndSpawnHarvester(spawn)) return;
  if (verifyAndSpawnCollector(spawn)) return;
  if (verifyAndSpawnMover(spawn)) return;

  // if (verifyAndSpawnUpgrader(spawn)) return;
  //TODO: faz o resto de acordo com importancia, como fazer estruturas e miliatres
}

//Retorna se spawnou algum
function verifyAndSpawnHarvester(spawn: StructureSpawn) {
  if (getSpawnEnergyAvailable(spawn) < MIN_ENERGY_TO_SPAWN_HARVESTER) {
    return;
  }

  let harvesters = 0;
  let latestHarvesterId = 0;
  for (const creep of Object.values(Game.creeps)) {
    if (creep.memory.role == Roles.HARVESTER) {
      harvesters++;
      const harvesterId = getIdFromString(creep.name, harvesterPrefix);
      if (harvesterId > latestHarvesterId) latestHarvesterId = harvesterId;

      if (harvesters >= MAX_HARVESTERS) {
        return false;
      }
    }
  }
  const harvesterName = harvesterPrefix + (latestHarvesterId + 1);
  spawn.room.visual.text("Spawnando " + harvesterName + "...", 30, 30);
  const spawnResult = spawn.spawnCreep(getHarvesterPartsToSpawn(spawn), harvesterName, {
    memory: { role: Roles.HARVESTER, need_renew: false, transferring: false, manual: false, target_id: null, state: 1 }
  });
  if (spawnResult == ERR_NAME_EXISTS) {
    spawn.room.visual.text("ERRO! HARVESTER NOME COLISÃO!", 0, 20);
    return false;
  }
  if (spawnResult == ERR_NOT_ENOUGH_ENERGY) {
    spawn.room.visual.text("ERRO! Tentou criar harvester com mais energia disponivel!", 10, 40);
    return false;
  }

  console.log("Resultado spawn: " + spawnResult);
  return true;
}

function verifyAndSpawnCollector(spawn: StructureSpawn) {
  if (getSpawnEnergyAvailable(spawn) < MIN_ENERGY_TO_SPAWN_COLLECTOR) {
    return;
  }
  if (spawn.spawning) {
    console.log("SPAWNANDO!");
    return;
  }

  const { exceed, name } = getNextOfRoleOrEarlyReturn(collectorPrefix, Roles.COLLECTOR, MAX_COLLECTORS);
  if (exceed)
    return false;

  spawn.room.visual.text("Spawnando " + name + "...", 30, 30);
  const spawnResult = spawn.spawnCreep(getCollectorPartsToSpawn(spawn), name, {
    memory: defaultCreepMemory(Roles.COLLECTOR)
  });

  if (spawnResult == ERR_NAME_EXISTS) {
    spawn.room.visual.text("ERRO! COLLECTOR NOME COLISÃO!", 0, 30);
    return false;
  }
  if (spawnResult == ERR_NOT_ENOUGH_ENERGY) {
    spawn.room.visual.text("ERRO! Tentou criar collector sem energia disponivel!", 10, 30);
    return false;
  }

  console.log("Resultado spawn: " + spawnResult);
  return true;
}

function verifyAndSpawnMover(spawn: StructureSpawn) {
  if (getSpawnEnergyAvailable(spawn) < MIN_ENERGY_TO_SPAWN_MOVER || spawn.spawning) {
    return;
  }

  const { exceed, name } = getNextOfRoleOrEarlyReturn(moverPrefix, Roles.MOVER, MAX_MOVERS);
  if (exceed)
    return false;

  spawn.room.visual.text("Spawnando " + name + "...", 30, 30);
  const spawnResult = spawn.spawnCreep(getMoverPartsToSpawn(spawn), name, {
    memory: defaultCreepMemory(Roles.MOVER)
  });

  if (spawnResult == ERR_NAME_EXISTS) {
    spawn.room.visual.text("ERRO! MOVER NOME COLISÃO!", 0, 30);
    return false;
  }
  if (spawnResult == ERR_NOT_ENOUGH_ENERGY) {
    spawn.room.visual.text("ERRO! Tentou criar mover sem energia disponivel!", 10, 30);
    return false;
  }

  console.log("Resultado spawn: " + spawnResult);
  return true;
}



function defaultCreepMemory(role: Roles): CreepMemory {
  return { role: role, need_renew: false, transferring: false, manual: false, target_id: null, state: 1 };
}

function getNextOfRoleOrEarlyReturn(prefix: string, role: Roles, maxOfRole: number) {
  let roleCount = 0;
  let latestRoleId = 0;
  for (const creep of Object.values(Game.creeps)) {
    if (creep.memory.role == role) {
      roleCount++;
      const roleId = getIdFromString(creep.name, prefix);
      if (roleId > latestRoleId)
        latestRoleId = roleId;
      if (roleCount >= maxOfRole)
        return { exceed: true, name: "" }
    }
  }
  return { exceed: false, name: prefix + (latestRoleId + 1) };
}

function getIdFromString(name: string, prefix: string): number {
  return parseInt(name.split(prefix)[1]);
}

function getHarvesterPartsToSpawn(spawn: StructureSpawn) {
  //quanto mais harvesters tiver, mais partes coloca, e quanto mais partes os mais velhos tiver, mais partes colocar;
  const energyAvailable = getSpawnEnergyAvailable(spawn);
  if (energyAvailable >= 500) return [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
  else if (energyAvailable >= 450) return [WORK, WORK, WORK, CARRY, CARRY, MOVE];
  else if (energyAvailable >= 350) return [WORK, WORK, CARRY, CARRY, MOVE];
  else if (energyAvailable >= 300) return [WORK, WORK, CARRY, MOVE];
  else return [WORK, CARRY, MOVE];
}

function getCollectorPartsToSpawn(spawn: StructureSpawn) {
  const energyAvailable = getSpawnEnergyAvailable(spawn);
  if (energyAvailable >= 500) return [WORK, WORK, WORK, WORK, CARRY, MOVE];
  else {
    console.log("Não tinha energia disponível para spawnar collector!");
    return [WORK, CARRY, MOVE];
  }
}

function getMoverPartsToSpawn(spawn: StructureSpawn) {
  const energyAvailable = getSpawnEnergyAvailable(spawn);
  ///TODO: Fazer o tier acima, pq só spawna com 500
  if (energyAvailable >= 500) return [CARRY, CARRY, CARRY, WORK, MOVE, MOVE, MOVE, MOVE, MOVE];
  else {
    console.log("Não tinha energia disponível para spawnar mover!");
    return [CARRY, CARRY, CARRY, WORK, MOVE, MOVE, MOVE, MOVE, MOVE];
  }
}
