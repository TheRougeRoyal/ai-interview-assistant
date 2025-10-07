export function requireProfileComplete(profile: {name?:string;email?:string;phone?:string}): boolean { 
  return !!(profile?.name && profile?.email && profile?.phone) 
}
