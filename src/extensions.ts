export function getExtensionWithSpace(room: Room, minCapacity: number): StructureExtension | null {
  for (const structure of room.find(FIND_STRUCTURES)) {
    if (isExtension(structure) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > minCapacity)
      return structure;
  }
  return null;
}

export function getExtensionEnergyInRoom(room: Room) {
  let totalEnergy = 0;
  const extensions = room.find<StructureExtension>(FIND_MY_STRUCTURES, {
    filter: s => s.structureType == STRUCTURE_EXTENSION
  });

  for (const extension of extensions) {
    totalEnergy += extension.store.energy;
  }
  return totalEnergy;
}

export function isExtension(structure: Structure<StructureConstant>): structure is StructureExtension {
  return structure.structureType == STRUCTURE_EXTENSION;
}
