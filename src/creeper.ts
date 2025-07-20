import { Roles } from "./constants";

const ticksToRenew = 300;
const ticksToRenewUrgently = 200;
const spawnMinFreeCapacityOverhead = 10;
const minControllerTicksToDowngrade = 300;

export function creepLoop(creep: Creep) {
  if (creep.memory.need_renew && totalEnergyStored() > 200) {
    console.log("creeper movendo para renovar");
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
  if (creep.memory.transferring && creep.store[RESOURCE_ENERGY] == 0)
    creep.memory.transferring = false;

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

  if (creep.memory.transferring && creep.store[RESOURCE_ENERGY] == 0)
    creep.memory.transferring = false;

  if (creep.store.getFreeCapacity() > 0 && !creep.memory.transferring) {
    getEnergy(creep);
    return;
  }

  if (Object.values(Game.constructionSites).length > 0 && (!creep.room.controller || creep.room.controller.ticksToDowngrade > minControllerTicksToDowngrade)) {
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
  let workResult = 0;
  ///TODO: pegar o spawn que mais precisa, não fixar me um só
  const spawn = Game.spawns["Spawn1"];
  let target;
  let containerWithSpace = getExtensionWithSpace(creep.room, spawnMinFreeCapacityOverhead);
  if (creep.store[RESOURCE_ENERGY] <= (spawn.store.getFreeCapacity(RESOURCE_ENERGY) - spawnMinFreeCapacityOverhead)) {
    const energyToTransfer = Math.min(creep.store.energy, spawn.store.getFreeCapacity(RESOURCE_ENERGY));
    workResult = creep.transfer(spawn, RESOURCE_ENERGY, energyToTransfer);
    target = spawn;
  }
  else if (containerWithSpace != null) {
    const energyToTransfer = Math.min(creep.store.energy, containerWithSpace.store.getFreeCapacity(RESOURCE_ENERGY));
    workResult = creep.transfer(containerWithSpace, RESOURCE_ENERGY, energyToTransfer);
    target = containerWithSpace;
  }
  else if ((creep.room.controller?.level ?? 0) < 2 || Object.values(Game.constructionSites).length <= 0) {
    if (!creep.room.controller) {
      console.log("Creeper deveria fazer upgrade no controller mas não tem");
      return
    }
    workResult = creep.upgradeController(creep.room.controller);
    target = creep.room.controller;
  }
  else {
    ///TODO: Usar preferencia nas construções
    const constructionSite = Object.values(Game.constructionSites)[0];
    workResult = creep.build(constructionSite);
    target = constructionSite;
  }


  if (workResult == ERR_NOT_IN_RANGE)
    creep.moveTo(target);
  else if (workResult != 0) {
    console.log(creep.name + " erro trabalhando: " + workResult + ". Tentou transferir " + creep.store[RESOURCE_ENERGY] + ". target " + target);
  }

}

function getExtensionWithSpace(room: Room, minCapacity: number): StructureExtension | null {

  for (const structure of Object.values(Game.structures)) {
    if (isExtension(structure) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > minCapacity)
      return structure;
  }
  return null;
}

function isExtension(structure: Structure<StructureConstant>): structure is StructureExtension {
  return structure.structureType == STRUCTURE_EXTENSION;
}

function isContainer(structure: Structure<StructureConstant>): structure is StructureContainer {
  return structure.structureType == "container";
}


function totalEnergyStored() {
  let totalEnergy = 0;
  for (const spawn of Object.values(Game.spawns)) {
    totalEnergy += spawn.store.getUsedCapacity(RESOURCE_ENERGY);
  }
  return totalEnergy;
}
