export function getExtensionWithSpace(room: Room, minCapacity: number): StructureExtension | null {
  for (const structure of room.find(FIND_STRUCTURES)) {
    if (isExtension(structure) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > minCapacity)
      return structure;
  }
  return null;
}

export function getExtensionEnergyInRoom(room: Room){
  let totalEnergy = 0;
  for (const structure of room.find(FIND_STRUCTURES)) {
    if (isExtension(structure) )
      totalEnergy+= structure.store[RESOURCE_ENERGY];
  }

  return totalEnergy;
}

export function isExtension(structure: Structure<StructureConstant>): structure is StructureExtension {
  return structure.structureType == STRUCTURE_EXTENSION;
}
