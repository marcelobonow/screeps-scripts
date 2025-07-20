import { ticksToRenew } from "./creeper";
import { EnergyReceivable, EnergyReceivableNullable, EnergyProvider, EnergyProviderNullable } from "./main";
import { getSpawnEnergyAvailable, MIN_ENERGY_TO_RENEW } from "./spawn";

export enum MoverStates {
  charging = 1,
  transferring = 2,
}

export function moverLoop(creep: Creep) {
  ///Se tiver cheio, procura a building mais proxima e manda para la
  ///Se estiver com alguma energia,
  ///  verifica o que é mais proximo, uma fonte de energia ou construction site
  ///  e vai para o mais próximo
  ///Se estiver sem energia nenhuma vai para o container mais próximo

  ///TODO: n fazer todo frame, só verificar nas mudanças
  const needRenew = (creep.ticksToLive ?? 0) < ticksToRenew;
  creep.memory.need_renew = needRenew;

  const spawn = Game.spawns["Spawn1"];
  if (spawn && needRenew && getSpawnEnergyAvailable(spawn) > MIN_ENERGY_TO_RENEW) {
    console.log("creeper movendo para renovar");
    creep.moveTo(spawn);
    return;
  }

  if (creep.memory.state == MoverStates.transferring && creep.store.energy == 0) {
    setNewState(creep, MoverStates.charging);
  }
  if (creep.memory.state == MoverStates.charging && creep.store.getFreeCapacity() == 0) {
    setNewState(creep, MoverStates.transferring);
  }

  if (creep.memory.target_id == null) {
    if (creep.memory.state == MoverStates.transferring) {
      const nearestPlace = getNearestPlaceNeedingEnergy(creep);
      if (!nearestPlace) {
        creep.say("S/L l E");
        return;
      }
      creep.memory.target_id = nearestPlace.id;
    }
    else {
      const nearestPlace = getNearestEnergySource(creep);
      if (!nearestPlace) {
        creep.say("S/L p E");
        return;
      }
      creep.memory.target_id = nearestPlace.id;

    }
  }

  if (creep.memory.state == MoverStates.charging)
    getEnergy(creep, creep.memory.target_id);
  else {
    sendEnergy(creep, creep.memory.target_id);
  }

}


function getNearestEnergySource(creep: Creep): EnergyProviderNullable {
  const closestContainer = creep.pos.findClosestByPath<StructureContainer>(FIND_STRUCTURES, {
    filter: (structure) => structure.structureType == STRUCTURE_CONTAINER && structure.store.energy > 0
  });

  if (closestContainer != null)
    return closestContainer;

  console.log("Sem energia guardada para mover!");
  return null;
  // return creep.pos.findClosestByPath(FIND_SOURCES);
}

function getNearestPlaceNeedingEnergy(creep: Creep): EnergyReceivableNullable {
  ///Primeiro verifica se tem construção,
  ///Se não tiver construção precisando, envia para container
  ///Se todos containers estiverem cheios, envia para spawn
  ///Se spawn estiver cheio, mandar para fazer upgrade no controller
  ///TODO: usar sistema de prioridade, para poder enviar de um container para outro
  const nearestConstruction = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
  if (nearestConstruction != null)
    return nearestConstruction;
  const closestExtension = creep.pos.findClosestByPath<StructureExtension>(FIND_STRUCTURES, {
    filter: (structure) => structure.structureType == STRUCTURE_EXTENSION && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  });
  if (closestExtension != null)
    return closestExtension;

  ///TODO: lidar com mais de um spawn por room
  const spawn = Object.values(Game.spawns)[0];
  if (spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
    return spawn;

  ///Se não tiver mais nada, faz upgrade
  return creep.room.controller ?? null;
}

function sendEnergy(creep: Creep, targetId: string) {
  let workResult = null;
  const target = Game.getObjectById<EnergyReceivable>(targetId);

  if (target == null) {
    creep.memory.target_id = null;
    console.log("Mover tentando enviar energia com targetId inválido: " + targetId);
    return;
  }

  if (target instanceof ConstructionSite) {
    workResult = creep.build(target);
  }
  else {
    if (target.structureType == STRUCTURE_CONTROLLER)
      workResult = creep.upgradeController(target as StructureController);
    else if (target.structureType == STRUCTURE_EXTENSION || target.structureType == STRUCTURE_SPAWN) {
      const spaceRemaining = (target as StructureContainer).store.getFreeCapacity(RESOURCE_ENERGY);
      if (spaceRemaining == 0) {
        ///Se encheu o alvo, troca para o próximo
        creep.memory.target_id = getNearestPlaceNeedingEnergy(creep)?.id || null;
        console.log("[Mover] Encheu alvo, trocando");
        return;
      }
      workResult = creep.transfer(target, RESOURCE_ENERGY, Math.min(creep.store.energy, spaceRemaining));
    }
  }
  if (creep.store.energy == 0 || workResult == null || workResult == ERR_NOT_ENOUGH_ENERGY || workResult == ERR_FULL) {
    setNewState(creep, MoverStates.charging);
  }

  if (workResult == ERR_NOT_IN_RANGE)
    creep.moveTo(target);
  else if (workResult != 0)
    console.log("Erro mover enviando energia: " + workResult + ". para: " + (target ?? targetId));
}

function getEnergy(creep: Creep, targetId: string) {

  let workResult = null;
  const target = Game.getObjectById<StructureContainer>(targetId);

  if (target == null) {
    creep.memory.target_id = null;
    console.log("Mover tentando pegar energia com targetId inválido: " + targetId);
    return;
  }

  if (target.structureType == STRUCTURE_CONTAINER) {
    const energyToGet = Math.min(creep.store.getFreeCapacity(), target.store.energy);
    workResult = creep.withdraw(target, RESOURCE_ENERGY, energyToGet);
  }
  if (workResult == null)
    console.log("Target pegar energia do mover não é nenhum: " + targetId);

  if (workResult == ERR_NOT_ENOUGH_ENERGY || workResult == ERR_FULL) {
    setNewState(creep, MoverStates.transferring);
  }

  if (workResult == ERR_NOT_IN_RANGE)
    creep.moveTo(target);
  else if (workResult != 0)
    console.log("Erro pegando energia mover: " + workResult);
}


function setNewState(creep: Creep, state: MoverStates) {
  creep.memory.state = state;
  creep.memory.target_id = null
}
