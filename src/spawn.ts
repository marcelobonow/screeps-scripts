import { collectorPrefix, harvesterPrefix, Roles, upgraderPrefix } from "./constants";
import { getExtensionEnergyInRoom } from "./extensions";

const MIN_ENERGY_TO_RENEW = 50;
const MAX_TICKS_TO_RENEW = 1200;
const MIN_ENERGY_TO_SPAWN_HARVESTER = 300;
const MIN_ENERGY_TO_SPAWN_COLLECTOR = 500;
const MAX_HARVESTERS = 0;
const MAX_UPGRADERS = 2;
const MAX_COLLECTORS = 2;

export function spawnLoop(spawn: StructureSpawn) {
  //Verifica se algum creep esta precisando de reparo;

  for (const creepName in Game.creeps) {
    const creep = Game.creeps[creepName];
    if (creep.memory.need_renew && spawn.store.getUsedCapacity(RESOURCE_ENERGY) > MIN_ENERGY_TO_RENEW) {
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
        else if (renewResult == ERR_NOT_IN_RANGE)
          continue;
        else {
          console.log("Erro renovando: " + renewResult);
          break;
        }
      }
    }
  }

  if (spawn.spawning)
    return;

  if (verifyAndSpawnHarvester(spawn)) return;
  if (verifyAndSpawnCollector(spawn)) return;

  // if (verifyAndSpawnUpgrader(spawn)) return;
  //TODO: faz o resto de acordo com importancia, como fazer estruturas e miliatres
}

//Retorna se spawnou algum
function verifyAndSpawnHarvester(spawn: StructureSpawn) {
  if (getEnergyAvailable(spawn) < MIN_ENERGY_TO_SPAWN_HARVESTER) {
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
    memory: { role: Roles.HARVESTER, need_renew: false, transferring: false, manual: false }
  });
  if (spawnResult == ERR_NAME_EXISTS) {
    spawn.room.visual.text("ERRO! HARVESTER NOME COLISÃO!", 0, 30);
    return false;
  }
  if (spawnResult == ERR_NOT_ENOUGH_ENERGY) {
    spawn.room.visual.text("ERRO! Tentou criar harvester com mais energia disponivel!", 10, 30);
    return false;
  }

  console.log("Resultado spawn: " + spawnResult);
  return true;
}

function verifyAndSpawnCollector(spawn: StructureSpawn) {
  if (getEnergyAvailable(spawn) < MIN_ENERGY_TO_SPAWN_COLLECTOR) {
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
    memory: { role: Roles.COLLECTOR, need_renew: false, transferring: false, manual: false }
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
  const energyAvailable = getEnergyAvailable(spawn);
  if (energyAvailable >= 500) return [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
  else if (energyAvailable >= 450) return [WORK, WORK, WORK, CARRY, CARRY, MOVE];
  else if (energyAvailable >= 350) return [WORK, WORK, CARRY, CARRY, MOVE];
  else if (energyAvailable >= 300) return [WORK, WORK, CARRY, MOVE];
  else return [WORK, CARRY, MOVE];
}

function getCollectorPartsToSpawn(spawn: StructureSpawn) {
  const energyAvailable = getEnergyAvailable(spawn);
  if (energyAvailable >= 500) return [WORK, WORK, WORK, WORK, CARRY, MOVE];
  else {
    console.error("Não tinha energia disponível para spawnar collector!");
    return [WORK, CARRY, MOVE];
  }
}


function getEnergyAvailable(spawn: StructureSpawn) {
  return spawn.store[RESOURCE_ENERGY] + getExtensionEnergyInRoom(spawn.room);
}
