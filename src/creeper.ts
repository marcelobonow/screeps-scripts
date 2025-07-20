import { getSpawnEnergyAvailable, MIN_ENERGY_TO_RENEW } from './spawn';
import { collectorLoop } from "./collector";
import { Roles } from "./constants";
import { getExtensionWithSpace } from "./extensions";
import { moverLoop } from "./mover";

export const ticksToRenew = 300;
const spawnMinFreeCapacityOverhead = 0;

export function creepLoop(creep: Creep) {
  if (creep.spawning)
    return;

  ///TODO: pegar o spawn mais proximo;
  const spawn = Game.spawns["Spawn1"];
  if (creep.memory.need_renew && getSpawnEnergyAvailable(spawn) > MIN_ENERGY_TO_RENEW) {
    console.log("creeper movendo para renovar");
    creep.moveTo(spawn);
    return;
  }
  else if (creep.memory.need_renew && getSpawnEnergyAvailable(spawn) < MIN_ENERGY_TO_RENEW) {
    creep.say("Não tem energia pra renovar!");
  }


  if (creep.memory.role == Roles.HARVESTER)
    harvesterLoop(creep);
  else if (creep.memory.role == Roles.COLLECTOR)
    collectorLoop(creep);
  else if (creep.memory.role == Roles.MOVER)
    moverLoop(creep);
}

function harvesterLoop(creep: Creep) {
  if (creep.memory.transferring && creep.store[RESOURCE_ENERGY] == 0)
    creep.memory.transferring = false;

  const needRenew = (creep.ticksToLive ?? 0) < 300;
  creep.memory.need_renew = needRenew;


  if (creep.store.getFreeCapacity() > 0 && !creep.memory.transferring)
    getEnergy(creep);
  else
    sendEnergyBack(creep);
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
  if (spawn.store.getFreeCapacity(RESOURCE_ENERGY) > spawnMinFreeCapacityOverhead) {
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
