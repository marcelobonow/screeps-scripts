import { Roles } from "./constants";

const ticksToRenew = 300;

export function creepLoop(creep: Creep) {
  if (creep.memory.need_renew && totalEnergyStored() > 200) {
    creep.say("indo renovar!");
    creep.moveTo(Game.spawns["Spawn1"]);
    return;
  }
  else if (totalEnergyStored() < 200) {
    creep.say("Não tem energia pra renovar!");
  }


  if (creep.memory.role == Roles.HARVESTER)
    harvesterLoop(creep);
  else if (creep.memory.role == Roles.UPGRADER)
    upgraderLoop(creep);
}

function harvesterLoop(creep: Creep) {
  if (creep.store.getFreeCapacity() > 0 && !creep.memory.upgrading)
    getEnergy(creep);
  else
    sendEnergyBack(creep);
}

function upgraderLoop(creep: Creep) {
  if (totalEnergyStored() < 200)
    return;

  if (!creep.memory.upgrading && (creep.ticksToLive ?? 0) <= ticksToRenew) {
    creep.say("Precisa renovar!");
    creep.memory.need_renew = true;
  }

  if (creep.store.getFreeCapacity() > 0 && !creep.memory.upgrading) {
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
  if (creep.build(build) == ERR_NOT_IN_RANGE)
    creep.moveTo(build);
}

function upgradeController(creep: Creep) {
  const controller = creep.room.controller;
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
  //TODO: Fazer prioridade de energia
  var target: any = Game.spawns["Spawn1"];
  if (target.store.getFreeCapacity(RESOURCE_ENERGY) <= 0) {
    target = target.room.controller;
    creep.memory.upgrading = true;
  }
  if (creep.transfer(target, RESOURCE_ENERGY, creep.store.getCapacity()) == ERR_NOT_IN_RANGE)
    creep.moveTo(target);
  else {
    console.log("AQUI!: " + creep.transfer(target, RESOURCE_ENERGY, creep.store.getCapacity()));
    if ((creep.ticksToLive ?? 0) <= ticksToRenew) {
      creep.say("Precisa renovar!");
      creep.memory.need_renew = true;
    }
  }
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) == 0)
    creep.memory.upgrading = false;
}

function totalEnergyStored() {
  let totalEnergy = 0;
  for (const spawn of Object.values(Game.spawns)) {
    totalEnergy += spawn.store.getUsedCapacity(RESOURCE_ENERGY);
  }
  return totalEnergy;
}
