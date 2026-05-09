import { prisma } from "../../../config/database.js";
import { logger } from "../../../utils/logger.js";

export async function handleGetVariables(chargerId: number, payload: any): Promise<any> {
    logger.info(`Handling GetVariables for charger ${chargerId}`, payload);
    const getVariableData = payload.getVariableData || [];
    const getVariableResult = [];

    for (const req of getVariableData) {
        const { component, variable, attributeType = "Actual" } = req;
        const componentName = component.name;
        const componentInstance = component.instance || null;
        const variableName = variable.name;
        const variableInstance = variable.instance || null;

        const dbComponent = await prisma.deviceComponent.findFirst({
            where: {
                chargerId,
                name: componentName,
                instance: componentInstance,
            },
            include: {
                variables: {
                    where: {
                        name: variableName,
                        instance: variableInstance,
                    },
                    include: {
                        attributes: {
                            where: {
                                type: attributeType,
                            }
                        }
                    }
                }
            }
        });

        let attributeStatus = "UnknownVariable";
        let attributeValue = undefined;
        let attributeTypeRes = attributeType;

        if (dbComponent) {
            if (dbComponent.variables && dbComponent.variables.length > 0) {
                const dbVar = dbComponent.variables[0];
                if (dbVar.attributes && dbVar.attributes.length > 0) {
                    const attr = dbVar.attributes[0];
                    if (attr.value !== null) {
                        attributeStatus = "Accepted";
                        attributeValue = attr.value;
                    } else {
                        attributeStatus = "UnknownVariable";
                    }
                } else {
                     attributeStatus = "UnknownVariable";
                }
            } else {
                attributeStatus = "UnknownVariable";
            }
        } else {
            attributeStatus = "UnknownComponent";
        }

        getVariableResult.push({
            attributeStatus,
            attributeType: attributeTypeRes,
            attributeValue,
            component,
            variable,
        });
    }

    return { getVariableResult };
}

export async function handleSetVariables(chargerId: number, payload: any): Promise<any> {
    logger.info(`Handling SetVariables for charger ${chargerId}`, payload);
    const setVariableData = payload.setVariableData || [];
    const setVariableResult = [];

    for (const req of setVariableData) {
        const { attributeType = "Actual", attributeValue, component, variable } = req;
        const componentName = component.name;
        const componentInstance = component.instance || null;
        const variableName = variable.name;
        const variableInstance = variable.instance || null;

        const dbComponent = await prisma.deviceComponent.findFirst({
            where: {
                chargerId,
                name: componentName,
                instance: componentInstance,
            },
            include: {
                variables: {
                    where: {
                        name: variableName,
                        instance: variableInstance,
                    },
                    include: {
                        attributes: {
                            where: {
                                type: attributeType,
                            }
                        }
                    }
                }
            }
        });

        let attributeStatus = "Rejected";

        if (dbComponent) {
             if (dbComponent.variables && dbComponent.variables.length > 0) {
                const dbVar = dbComponent.variables[0];
                if (dbVar.attributes && dbVar.attributes.length > 0) {
                    const attr = dbVar.attributes[0];
                    if (attr.mutability === "ReadOnly") {
                        attributeStatus = "Rejected";
                    } else {
                        await prisma.variableAttribute.update({
                            where: { id: attr.id },
                            data: { value: String(attributeValue) }
                        });
                        attributeStatus = "Accepted";
                    }
                } else {
                    // Create if not exists ?
                    await prisma.variableAttribute.create({
                        data: {
                            variableId: dbVar.id,
                            type: attributeType,
                            value: String(attributeValue)
                        }
                    });
                    attributeStatus = "Accepted";
                }
             } else {
                 attributeStatus = "UnknownVariable";
             }
        } else {
            attributeStatus = "UnknownComponent";
        }

        setVariableResult.push({
            attributeStatus,
            component,
            variable,
            attributeType
        });
    }

    return { setVariableResult };
}

export async function handleGetBaseReport(chargerId: number, payload: any): Promise<any> {
    logger.info(`Handling GetBaseReport for charger ${chargerId}`, payload);
    // Real implementation would trigger actual fetching from charger or async processing
    // For now, accept the report request
    return { status: "Accepted" };
}

export async function handleNotifyReport(chargerId: number, payload: any): Promise<any> {
    logger.info(`Handling NotifyReport for charger ${chargerId}`, payload);
    const reportData = payload.reportData || [];

    for (const data of reportData) {
        const component = data.component;
        const variable = data.variable;
        const variableAttribute = data.variableAttribute || [];

        const componentName = component.name;
        const componentInstance = component.instance || null;
        const evseId = component.evse?.id || null;
        const connectorId = component.evse?.connectorId || null;

        const variableName = variable.name;
        const variableInstance = variable.instance || null;

        // Upsert component (Find first, if not create)
        // Prisma doesn't have an easy findOrCreate/upsert for multiple nullables in unique constraint
        let dbComponent = await prisma.deviceComponent.findFirst({
            where: {
                chargerId,
                name: componentName,
                instance: componentInstance,
            }
        });

        if (!dbComponent) {
             dbComponent = await prisma.deviceComponent.create({
                 data: {
                     chargerId,
                     name: componentName,
                     instance: componentInstance,
                     evseId,
                     connectorId
                 }
             });
        } else {
             dbComponent = await prisma.deviceComponent.update({
                  where: { id: dbComponent.id },
                  data: { evseId, connectorId }
             });
        }

        // Upsert Variable
        let dbVariable = await prisma.deviceVariable.findFirst({
            where: {
                componentId: dbComponent.id,
                name: variableName,
                instance: variableInstance
            }
        });

        if (!dbVariable) {
             dbVariable = await prisma.deviceVariable.create({
                 data: {
                     componentId: dbComponent.id,
                     name: variableName,
                     instance: variableInstance
                 }
             });
        }

        // Upsert Attributes
        for (const attr of variableAttribute) {
             const type = attr.type || "Actual";
             const value = attr.value !== undefined ? String(attr.value) : null;
             const mutability = attr.mutability || null;
             const persistent = attr.persistent || false;
             const constant = attr.constant || false;

             let dbAttribute = await prisma.variableAttribute.findFirst({
                 where: {
                     variableId: dbVariable.id,
                     type: type
                 }
             });

             if (!dbAttribute) {
                 await prisma.variableAttribute.create({
                     data: {
                         variableId: dbVariable.id,
                         type: type,
                         value: value,
                         mutability: mutability,
                         persistent: persistent,
                         constant: constant
                     }
                 });
             } else {
                 await prisma.variableAttribute.update({
                     where: { id: dbAttribute.id },
                     data: {
                         value: value,
                         mutability: mutability,
                         persistent: persistent,
                         constant: constant
                     }
                 });
             }
        }
    }

    return {};
}
