import { describe, expect, it } from 'vitest'
import {
  esAdmin,
  esModerador,
  nombreRol,
  PERMISOS_POR_ROL,
  puedeResponder,
  puedeVerIdentidades,
  ROLES_ASIGNABLES,
  tieneBandeja,
} from '../roles'

const vecino = { rol: 'ciudadano' }
const moderador = { rol: 'moderador' }
const admin = { rol: 'admin' }
const funcionarioSalud = { rol: 'funcionario', area_id: 4 }
const funcionarioSinArea = { rol: 'funcionario', area_id: null }

const peticionSalud = { categorias: { area_id: 4 } }
const peticionSeguridad = { categorias: { area_id: 3 } }

describe('roles', () => {
  it('nombra cada rol y al dueño como CEO', () => {
    expect(nombreRol('ciudadano')).toBe('Vecino/a')
    expect(nombreRol('moderador')).toBe('Moderador/a')
    expect(nombreRol('admin', true)).toBe('CEO')
    expect(nombreRol(undefined)).toBe('Vecino/a')
  })

  it('moderan los moderadores y los admins, nadie más', () => {
    expect(esModerador(moderador)).toBe(true)
    expect(esModerador(admin)).toBe(true)
    expect(esModerador(funcionarioSalud)).toBe(false)
    expect(esModerador(vecino)).toBe(false)
    expect(esAdmin(moderador)).toBe(false)
  })

  it('la bandeja es de funcionarios y admins', () => {
    expect(tieneBandeja(funcionarioSalud)).toBe(true)
    expect(tieneBandeja(admin)).toBe(true)
    expect(tieneBandeja(moderador)).toBe(false)
  })

  it('el funcionario solo ve identidades y responde en su área', () => {
    expect(puedeVerIdentidades(funcionarioSalud, peticionSalud)).toBe(true)
    expect(puedeVerIdentidades(funcionarioSalud, peticionSeguridad)).toBe(false)
    expect(puedeResponder(funcionarioSalud, peticionSeguridad)).toBe(false)
    expect(puedeVerIdentidades(funcionarioSinArea, peticionSeguridad)).toBe(true)
  })

  it('admin ve todo; moderador y vecino no ven identidades', () => {
    expect(puedeVerIdentidades(admin, peticionSeguridad)).toBe(true)
    expect(puedeVerIdentidades(moderador, peticionSalud)).toBe(false)
    expect(puedeVerIdentidades(vecino, peticionSalud)).toBe(false)
  })

  it('cada rol asignable tiene su lista de permisos', () => {
    for (const [rol] of ROLES_ASIGNABLES) {
      expect(PERMISOS_POR_ROL[rol]?.length).toBeGreaterThan(0)
    }
    expect(PERMISOS_POR_ROL.dueno.length).toBeGreaterThan(0)
  })
})
