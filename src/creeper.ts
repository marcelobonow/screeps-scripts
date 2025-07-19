import { Roles } from "./constants";

const ticksToRenew = 300;
const ticksToRenewUrgently = 200;
const spawnMinFreeCapacityOverhead = 10;

export function creepLoop(creep: Creep) {
  if (creep.memory.need_renew && totalEnergyStored() > 200) {
    creep.say("indo renovar!");
    creep.moveTo(Game.spawns["Spawn1"]);
    return;
  }
  else if (creep.memory.need_renew && totalEnergyStored() < 200) {
    creep.say("Não tem energia pra renovar!");
  }


  if (creep.memory.role == Roles.HARVESTER)
    harvesterLoop(creep);
  else if (creep.memory.role == Roles.UPGRADER)
    upgraderLoop(creep);
}

function harvesterLoop(creep: Creep) {
  if (creep.store.getFreeCapacity() > 0 && !creep.memory.transferring)
    getEnergy(creep);
  else
    sendEnergyBack(creep);
}

function upgraderLoop(creep: Creep) {

  if (!creep.memory.transferring && (creep.ticksToLive ?? 0) <= ticksToRenewUrgently) {
    creep.say("Precisa renovar!");
    creep.memory.need_renew = true;
  }

  if(creep.memory.transferring && creep.store[RESOURCE_ENERGY] == 0)
    creep.memory.transferring = false;

  if (creep.store.getFreeCapacity() > 0 && !creep.memory.transferring) {
    getEnergy(creep);
    return;
  }

  if (Object.values(Game.constructionSites).length > 0) {
    buildTarget(creep, Object.values(Game.constructionSites)[0]);
    return;
  }
  else {
    upgradeController(creep);
    return;
  }
}

function buildTarget(creep: Creep, build: ConstructionSite<BuildableStructureConstant>) {
  creep.memory.transferring = true;
  if (creep.build(build) == ERR_NOT_IN_RANGE)
    creep.moveTo(build);
}

function upgradeController(creep: Creep) {
  const controller = creep.room.controller;
  creep.memory.transferring = true;
  if (controller && creep.upgradeController(controller) == ERR_NOT_IN_RANGE)
    creep.moveTo(controller);
}

function getEnergy(creep: Creep) {
  const target = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
  if (!target) {
    creep.say("Não tem mais energia!");
    return;
  }
  if (creep.harvest(target) == ERR_NOT_IN_RANGE)
    creep.moveTo(target);
}

function sendEnergyBack(creep: Creep) {
  //Se tiver prestes a morrer, vai se renovar primeiro; mas deveria ser o limiar com menos ticks restantes
  if (creep.ticksToLive && creep.ticksToLive <= ticksToRenew) {
    creep.memory.need_renew = true;
    return;
  }

  creep.memory.transferring = true;
  let target: any = Game.spawns["Spawn1"];
  if (creep.store[RESOURCE_ENERGY] >= (target.store.getFreeCapacity(RESOURCE_ENERGY) + spawnMinFreeCapacityOverhead)) {
    target = target.room.controller;
  }

  const transferResult = creep.transfer(target, RESOURCE_ENERGY, creep.store[RESOURCE_ENERGY]);

  if (transferResult == ERR_NOT_IN_RANGE)
    creep.moveTo(target);
  else if (transferResult != 0)
    console.log("Erro transferindo: " + transferResult);

  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0)
    creep.memory.transferring = false;
}

function totalEnergyStored() {
  let totalEnergy = 0;
  for (const spawn of Object.values(Game.spawns)) {
    totalEnergy += spawn.store.getUsedCapacity(RESOURCE_ENERGY);
  }
  return totalEnergy;
}
