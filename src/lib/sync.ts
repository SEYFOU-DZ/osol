import { apiRequest } from './api'

// مزامنة الأصول
export async function syncCreateAsset(wsId: string, assetData: any) {
  try {
    const res = await apiRequest(`/workspaces/${wsId}/assets`, {
      method: 'POST',
      body: JSON.stringify(assetData)
    })
    return res
  } catch (err) {
    console.warn('API syncCreateAsset error, stored locally:', err)
    return null
  }
}

export async function syncUpdateAsset(id: string, assetData: any) {
  try {
    const res = await apiRequest(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assetData)
    })
    return res
  } catch (err) {
    console.warn('API syncUpdateAsset error:', err)
    return null
  }
}

export async function syncDeleteAsset(id: string) {
  try {
    await apiRequest(`/assets/${id}`, { method: 'DELETE' })
  } catch (err) {
    console.warn('API syncDeleteAsset error:', err)
  }
}

export async function syncAddAssetExpense(assetId: string, expenseData: any) {
  try {
    const res = await apiRequest(`/assets/${assetId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expenseData)
    })
    return res
  } catch (err) {
    console.warn('API syncAddAssetExpense error:', err)
    return null
  }
}

// مزامنة الأشخاص والديون
export async function syncCreatePerson(wsId: string, personData: any) {
  try {
    const res = await apiRequest(`/workspaces/${wsId}/people`, {
      method: 'POST',
      body: JSON.stringify(personData)
    })
    return res
  } catch (err) {
    console.warn('API syncCreatePerson error:', err)
    return null
  }
}

export async function syncCreateDebt(wsId: string, debtData: any) {
  try {
    const res = await apiRequest(`/workspaces/${wsId}/debts`, {
      method: 'POST',
      body: JSON.stringify(debtData)
    })
    return res
  } catch (err) {
    console.warn('API syncCreateDebt error:', err)
    return null
  }
}

export async function syncUpdateDebt(id: string, debtData: any) {
  try {
    const res = await apiRequest(`/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(debtData)
    })
    return res
  } catch (err) {
    console.warn('API syncUpdateDebt error:', err)
    return null
  }
}

export async function syncDeleteDebt(id: string) {
  try {
    await apiRequest(`/debts/${id}`, { method: 'DELETE' })
  } catch (err) {
    console.warn('API syncDeleteDebt error:', err)
  }
}

export async function syncAddDebtPayment(debtId: string, paymentData: any) {
  try {
    const res = await apiRequest(`/debts/${debtId}/payments`, {
      method: 'POST',
      body: JSON.stringify(paymentData)
    })
    return res
  } catch (err) {
    console.warn('API syncAddDebtPayment error:', err)
    return null
  }
}

// مزامنة المستودع
export async function syncCreateStockItem(wsId: string, itemData: any) {
  try {
    const res = await apiRequest(`/workspaces/${wsId}/stock`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    })
    return res
  } catch (err) {
    console.warn('API syncCreateStockItem error:', err)
    return null
  }
}

export async function syncUpdateStockItem(id: string, itemData: any) {
  try {
    const res = await apiRequest(`/stock/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData)
    })
    return res
  } catch (err) {
    console.warn('API syncUpdateStockItem error:', err)
    return null
  }
}

export async function syncDeleteStockItem(id: string) {
  try {
    await apiRequest(`/stock/${id}`, { method: 'DELETE' })
  } catch (err) {
    console.warn('API syncDeleteStockItem error:', err)
  }
}

export async function syncRecordStockMovement(wsId: string, movementData: any) {
  try {
    const res = await apiRequest(`/workspaces/${wsId}/stock/movement`, {
      method: 'POST',
      body: JSON.stringify(movementData)
    })
    return res
  } catch (err) {
    console.warn('API syncRecordStockMovement error:', err)
    return null
  }
}

// مزامنة الفواتير
export async function syncCreateInvoice(wsId: string, invoiceData: any) {
  try {
    const res = await apiRequest(`/workspaces/${wsId}/invoices`, {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    })
    return res
  } catch (err) {
    console.warn('API syncCreateInvoice error:', err)
    return null
  }
}

export async function syncUpdateInvoice(id: string, invoiceData: any) {
  try {
    const res = await apiRequest(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData)
    })
    return res
  } catch (err) {
    console.warn('API syncUpdateInvoice error:', err)
    return null
  }
}

export async function syncDeleteInvoice(id: string) {
  try {
    await apiRequest(`/invoices/${id}`, { method: 'DELETE' })
  } catch (err) {
    console.warn('API syncDeleteInvoice error:', err)
  }
}
