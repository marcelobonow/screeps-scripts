import { ticksToRenew } from "./creeper";
import { getSpawnEnergyAvailable, MIN_ENERGY_TO_RENEW } from "./spawn";

export function collectorLoop(creep: Creep) {
  const needRenew = (creep.ticksToLive ?? 0) < ticksToRenew;
  creep.memory.need_renew = needRenew;

  const spawn = Game.spawns["Spawn1"];
  if (needRenew && getSpawnEnergyAvailable(spawn) > MIN_ENERGY_TO_RENEW) {
    creep.moveTo(spawn);
    return;
  }

  if (creep.memory.transferring && creep.store.energy == 0)
    creep.memory.transferring = false;

  if (creep.memory.manual)
    return;

  if (creep.store.getFreeCapacity() > 0 && !creep.memory.transferring) {
    getEnergy(creep);
  }
  else
    storeEnergy(creep);

}

function getEnergy(creep: Creep) {
  ///TODO: colocar opção de vincular um collector e um target, em vez de só pegar do mais proximo
  const source = creep.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
  if (!source) {
    creep.say("sem source!");
    return;
  }
  const result = creep.harvest(source);
  if (result == ERR_NOT_IN_RANGE)
    creep.moveTo(source);
  else if (result != 0)
    console.log("Harvest result: " + result);
}

function storeEnergy(creep: Creep) {
  let workResult;
  let target: { pos: RoomPosition } | null;
  const closestContainer = creep.pos.findClosestByRange<StructureContainer>(FIND_STRUCTURES, {
    filter: (structure) => structure.structureType == STRUCTURE_CONTAINER && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
  });
  if (closestContainer != null) {
    target = closestContainer;
    const transfer = Math.min(creep.store.energy, closestContainer.store.getFreeCapacity());
    workResult = creep.transfer(closestContainer, RESOURCE_ENERGY, transfer);
  }

  else {
    ///TODO: Não colocar no lugar q precisa construir, remover daqui quando tiver mover.ts
    const closestConstruction = creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
    if (closestConstruction != null) {
      workResult = creep.build(closestConstruction);
      target = closestConstruction;
    }
    else {
      const spawn = Game.spawns["Spawn1"];
      const transfer = Math.min(creep.store.energy, spawn?.store?.getFreeCapacity() ?? 0);
      workResult = creep.transfer(spawn, RESOURCE_ENERGY, transfer);
      target = spawn;
    }
  }
  console.log("[Collector] Guardando energia em: " + target);
  if (workResult == ERR_NOT_IN_RANGE && target)
    creep.moveTo(target);
  if (workResult != ERR_NOT_ENOUGH_RESOURCES && workResult != ERR_FULL)
    creep.memory.transferring = true;
}
