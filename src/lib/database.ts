if (modifiedData?.is_default) {
  const { error: prefError } = await db.supabase
    .from('account_preferences')
    .update({
      availaibility_id: newBlock.id,
    })
    .eq('owner_account_address', account_address)

  if (prefError) {
    console.error('Error updating account preferences:', prefError)
    throw prefError
  }

  // Log the updated account preferences
  const { data: updatedPrefs } = await db.supabase
    .from('account_preferences')
    .select('*')
    .eq('owner_account_address', account_address)
    .single()

  console.log('Updated account preferences:', updatedPrefs)
}
