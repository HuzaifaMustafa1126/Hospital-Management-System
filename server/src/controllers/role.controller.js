import { z } from 'zod';
import { roleService } from '../services/role.service.js';
import { auditService } from '../services/audit.service.js';
const roleSchema=z.object({name:z.string().trim().min(2).max(100),description:z.string().trim().max(191).optional().nullable(),isActive:z.boolean().default(true)});
const context=(req)=>({userId:req.user.id,ipAddress:req.ip,userAgent:req.get('user-agent')});
export const roleController={
 async list(_req,res){res.json({success:true,data:await roleService.list()});},
 async catalog(_req,res){res.json({success:true,data:await roleService.catalog()});},
 async permissions(req,res){res.json({success:true,data:await roleService.permissions(req.params.id)});},
 async create(req,res){const role=await roleService.create(roleSchema.parse(req.body));await auditService.record({...context(req),action:'ROLE_CREATED',entity:'ROLE',entityId:role.id,newData:role});res.status(201).json({success:true,message:'Role created.',data:role});},
 async update(req,res){const role=await roleService.update(req.params.id,roleSchema.partial().refine((value)=>Object.keys(value).length>0).parse(req.body));await auditService.record({...context(req),action:'ROLE_UPDATED',entity:'ROLE',entityId:role.id,newData:role});res.json({success:true,message:'Role updated.',data:role});},
 async setPermissions(req,res){const {permissionIds}=z.object({permissionIds:z.array(z.string().min(1)).max(500)}).parse(req.body);const data=await roleService.setPermissions(req.params.id,permissionIds);await auditService.record({...context(req),action:'ROLE_PERMISSIONS_UPDATED',entity:'ROLE',entityId:req.params.id,newData:{permissionIds}});res.json({success:true,message:'Permissions updated.',data});},
 async remove(req,res){await roleService.remove(req.params.id);await auditService.record({...context(req),action:'ROLE_DELETED',entity:'ROLE',entityId:req.params.id});res.json({success:true,message:'Role deleted.'});},
};
